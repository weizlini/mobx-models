import {
  action,
  toJS,
  reaction,
  makeObservable,
  observable,
  runInAction,
} from "mobx";
import localForage from "localforage";
import type { RootStore } from "../index";

/**
 * The Base Class for State classes
 *
 * This base class contains methods and properties that are used to
 * determine which props are saved into local storage
 *
 * The derived class must call this base class' init method to initiate
 * the automatic storage and retrieval from the local storage
 *
 * When an observable value is marked as one should be saved, every change
 * will trigger an update to the value in local storage by the use
 * of a mobx reaction
 *
 * derived classes should always take the root store argument and
 * pass it via super(root) to the parent's constructor. this
 * allows all sub-states to access the other state instances
 *
 * derived classes must not try to use MakeAutoObservable(this)
 * in the constructor use makeObservable(this,attributes)
 */
export default class BaseState {
  root: RootStore;
  /**
   * Le constructeur initialize la connection aux root store
   * pour que chaque store puissent accèder à tous les autres
   *
   * @param rootStore la référence au root
   */
  constructor(root: RootStore) {
    this.root = root;
    makeObservable(this, {
      loadFromStorage: action,
      saveToStorage: action,
      initialStateRestored: observable,
    });
  }

  /**
   * PROPS TO BE SYNC'D AND PERSIST IN LOCAL STORAGE AND THEIR INITIAL VALUES
   *
   * Override this object to mark properties that should be synced with
   * local storage (async storage on mobile)
   *
   * the properties of this object are the keys of observable values to watch
   * the value is the initial value to save if there is no entry in the storage
   *
   * @type {{[string]:any}}
   */
  save: Record<string, boolean> = {};

  /**
   * PROPS TO BE SYNC'D WITH SESSION STORAGE AND THEIR INITIAL VALUES
   *
   * Override this object to mark properties that should be synced with
   * session storage (async storage on mobile)
   *
   * the properties of this object are the keys of observable values to watch
   * the value is the initial value to save if there is no entry in the storage
   *
   * @type {{[string]:any}}
   */
  session: Record<string, boolean> = {};

  /**
   * is set to true once the initial state is restored from async / local storage
   * @type {boolean}
   */
  initialStateRestored = false;

  /**
   * these are not really used right now as the state classes
   * persist during the lifecycle of the page or app session
   * and there is no formal garbage collection.
   *
   * however, in practice one should save a reaction's
   * destructor in case we need it
   */
  reactionDisposers = {};

  /**
   * creates reactions that will save the value of an observable
   * if declared in the save or session properties
   *
   * Saving will begin only after initial values are restored
   */
  register() {
    Object.keys(this.save).forEach((key) => {
      this.reactionDisposers[key] = reaction(
        () => this[key],
        async () => {
          if (this.initialStateRestored) {
            return this.saveToStorage(platformLocalStorage, key);
          }
        }
      );
    });

    Object.keys(this.session).forEach((key) => {
      this.reactionDisposers[key] = reaction(
        () => this[key],
        async () => {
          if (this.initialStateRestored) {
            return this.saveToStorage(platformSessionStorage, key);
          }
        }
      );
    });
  }

  /**
   * private function called by the BaseState's init function.
   *
   * @return {Promise<void>}
   */
  async restoreInitialState() {
    //console.log(this.save);
    let promises = Object.keys(this.save).map((key) => {
      return this.loadFromStorage(platformLocalStorage, key, this.save[key]);
    });
    promises.concat(
      Object.keys(this.session).map((key) => {
        return this.loadFromStorage(
          platformSessionStorage,
          key,
          this.session[key]
        );
      })
    );
    await Promise.all(promises);
    runInAction(() => {
      this.initialStateRestored = true;
    });
  }

  /**
   * a private function which loads values from storage.
   * @param storagePlatform {platformLocalStorage | platformSessionStorage}
   * @param key {string} the prop to load value from storage
   * @param initialValue  {*} the initial value to set if no value has been saved
   * @return {Promise<void>} AsyncStorage or localStorage are wrapped as always being async
   */
  async loadFromStorage(storagePlatform, key, initialValue) {
    try {
      let value = await storagePlatform.getItem(
        this.constructor.name + "_" + key
      );
      //console.log(`${value} which is a type of ${typeof value}`)
      /**
       * a null value indicates that there was no key in storage
       * so we must create one by immediately saving the value after
       * we set the initial value
       */
      if (value === null || value === undefined) {
        //console.log(`${this.constructor.name}.${key} not yet in storage.`)
        this[key] = initialValue;
        await this.saveToStorage(storagePlatform, key, initialValue);
        return;
      }
      /*console.log(
				`${this.constructor.name}.${key} successfully loaded from storage. value is ${value}`
			)*/
      runInAction(() => {
        this[key] = JSON.parse(value).value;
      });
    } catch (e) {
      /**
       * if there is an error, then set initialValue anyway but log the error
       */
      console.error(
        `error getting ${this.constructor.name}.${key} from storage.`
      );
      console.error(e);
      this[key] = initialValue;
      await this.saveToStorage(storagePlatform, key);
    }
  }

  /**
   * private function that saves the current value of a prop
   *
   * values are observables converted to JS and then encoded as JSON
   *
   * @param storagePlatform
   * @param key
   * @return {Promise<void>}
   */
  async saveToStorage(storagePlatform: any, key: string, overrideValue?: any): Promise<void> {
    console.log(toJS(overrideValue !== undefined ? overrideValue : this[key]));

    let jsonValue = JSON.stringify({ value: overrideValue !== undefined ? overrideValue : this[key] });
    try {
      await storagePlatform.setItem(
        this.constructor.name + "_" + key,
        jsonValue
      );
      /*console.log(
				`saved ${this.constructor.name}.${key} to storage with a value of ${jsonValue}`
			)*/
    } catch (e) {
      /*console.error(
				`error saving ${this.constructor.name}.${key} to storage with a value of ${jsonValue}`
			)
			console.error(e)*/
    }
  }

  /**
   * override this method for initializing data from the API
   * @return {Promise<void>}
   */

  async init(...args) {
    //console.log(this.save)
    //console.log(this.session)
    this.register();
    await this.restoreInitialState();
  }
}

const platformSessionStorage = localForage;
const platformLocalStorage = localForage;