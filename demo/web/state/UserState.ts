import {action, flow, observable} from "mobx";
import {BaseState, RootStore} from "mobx-models";

import {createUser, getUserById, listUsers, updateUser, type UserRow,} from "../lib/userRepo";
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
      this.list = yield Promise.resolve(listUsers({limit: 200, offset: 0}));
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
  *saveUser(): unknown{
    if (!this.editMode) return;

    this.busy = true;
    if(this.model === null) return;
    try {
      const isValid = yield this.model.validate();

      if (!isValid) {
        return false;
      }

      const payload = {
        email: String(this.model.email ?? "").trim().toLowerCase(),
        password: String(this.model.password ?? ""),
        firstName: String(this.model.firstName ?? ""),
        lastName: String(this.model.lastName ?? ""),
        age: Number(this.model.age ?? 0),
        birthday: String(this.model.birthday ?? ""),
      };

      const id = Number(this.model.id ?? 0);

      if (id === 0) {
        yield Promise.resolve(createUser(payload));
      } else {
        yield Promise.resolve(
            updateUser({
              id,
              ...payload,
            })
        );
      }

      const rows = yield Promise.resolve(listUsers({ limit: 200, offset: 0 }));
      this.list = rows as UserRow[];
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