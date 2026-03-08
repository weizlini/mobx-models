import { action, flow, observable } from "mobx";
import { BaseState, RootStore } from "mobx-models";

import {
  apiCreateUser,
  apiGetUserById,
  apiListUsers,
  apiUpdateUser,
} from "../lib/userApi";
import type { UserInput, UserRow } from "../lib/userRepo";
import UserModel from "./models/UserModel";

class UserState extends BaseState {
  @observable accessor list: UserRow[] = [];
  @observable accessor model: UserModel | null = null;
  @observable accessor editMode = false;
  @observable accessor busy = false;
  @observable accessor loadingList = false;
  @observable accessor loadingModel = false;
  @observable accessor initialized = false;

  constructor(root: RootStore) {
    super(root);
  }

  @action
  initializeUsers(users: UserRow[]): void {
    if (this.initialized) return;
    this.setUsers(users);
    this.initialized = true;
  }

  @action
  setUsers(users: UserRow[]): void {
    this.list = users;
  }

  @flow
  *loadUsers(): unknown {
    this.loadingList = true;

    try {
      this.list = yield apiListUsers({ limit: 200, offset: 0 });
    } finally {
      this.loadingList = false;
    }
  }

  @action
  newUser(): void {
    if (this.editMode || this.loadingModel || this.busy) return;

    const model = new UserModel();
    model.init();

    this.model = model;
    this.editMode = true;
  }

  @flow
  *editUser(id: number): unknown {
    if (this.editMode || this.loadingModel || this.busy) return;

    this.loadingModel = true;

    try {
      const row: UserRow | null = yield apiGetUserById(id);

      if (!row) {
        throw new Error(`UserState.editUser: user with id ${id} was not found.`);
      }

      const model = new UserModel();
      model.init({
        id: row.id,
        email: row.email,
        password: row.password,
        password2: row.password,
        firstName: row.firstName,
        lastName: row.lastName,
        birthday: row.birthday,
        age: row.age,
      });

      this.model = model;
      this.editMode = true;
    } finally {
      this.loadingModel = false;
    }
  }

  @flow
  *saveUser(): unknown {
    if (!this.editMode || this.model === null || this.busy) return false;

    const isValid: boolean = yield this.model.validate();

    if (!isValid) {
      return false;
    }

    this.busy = true;

    try {
      const id = Number(this.model.id.value ?? 0);

      if (id === 0) {
        const payload = this.model.toJS(true) as UserInput;
        yield apiCreateUser(payload);
      } else {
        const payload = this.model.toJS() as UserRow;
        yield apiUpdateUser(payload);
      }

      yield this.loadUsers();

      this.model = null;
      this.editMode = false;

      return true;
    } finally {
      this.busy = false;
    }
  }

  @action
  cancel(): void {
    if (this.busy || this.loadingModel) return;
    this.model = null;
    this.editMode = false;
  }
}

export default UserState;