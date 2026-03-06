import UserModel from "./models/UserModel";
import { RootStore, BaseState } from "mobx-models";
import { observable } from "mobx";
class UserState extends BaseState {
  model: UserModel | null = null;
}
export default UserState;
