import {action, flow, observable} from "mobx";
import {BaseState, RootStore} from "mobx-models";

import {createUser, getUserById, listUsers, updateUser, UserInput, type UserRow,} from "../lib/userRepo";
import UserModel from "./models/UserModel";

class UserState extends BaseState {
  @observable accessor list: UserRow[] = [];
  @observable accessor model: UserModel | null = null;
  @observable accessor editMode = false;
  @observable accessor busy = false;

  constructor(root: RootStore) {
    super(root);
  }

  @flow
  *loadUsers(): unknown {
    this.busy = true;

    try {
      this.list = yield listUsers({limit: 200, offset: 0});
    } finally {
      this.busy = false;
    }
  }

  @action
  newUser(): void {
    if (this.editMode) {
      throw new Error("UserState.newUser: cannot create a new user while already editing.");
    }

    const model = new UserModel();
    model.init({
      id: 0,
      email: "",
      password: "",
      password2: "",
      firstName: "",
      lastName: "",
      birthday: "",
      age: 0,
    });

    this.model = model;
    this.editMode = true;
  }

  @action
  editUser(id: number): void {
    if (this.editMode) return

    const row = getUserById(id);

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
  }


  @flow
  *saveUser(): unknown {
    if (!this.editMode || this.model === null) return;

    this.busy = true;

    try {
      const isValid = yield this.model.validate();

      if (!isValid) {
        return false;
      }

      const id = Number(this.model.id ?? 0);

      if (id === 0) {
        const payload = this.model.toJS(true);
        yield createUser(payload as UserInput);
      } else {
        const payload = this.model.toJS();
        updateUser(payload as UserRow);
      }

      this.list = yield listUsers({ limit: 200, offset: 0 });
      this.model = null;
      this.editMode = false;

      return true;
    } finally {
      this.busy = false;
    }
  }

  @action
  cancel(): void {
    this.model = null;
    this.editMode = false;
  }
}

export default UserState;