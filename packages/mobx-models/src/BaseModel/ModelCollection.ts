import type BaseModel from "./BaseModel";
import Field, { FieldType } from "./Field";
import { toJS } from "mobx";

export interface ModelCollectionOptions<TItem extends BaseModel, TParent extends BaseModel>
    extends Omit<Parameters<typeof Field<TItem[], TParent>>[2], "type"> {
  modelClass: new (parent?: TParent | null) => TItem;
}

/**
 * A field whose value is an array of child models.
 * Each entry is a BaseModel instance (row-form).
 */
export default class ModelCollection<
    TItem extends BaseModel = BaseModel,
    TParent extends BaseModel = BaseModel,
> extends Field<TItem[], TParent> {
  public readonly isModelCollection: true = true;

  public modelClass: new (parent?: TParent | null) => TItem;
  public initialValue: unknown[] = [];

  constructor(model: TParent, fieldName: string, options: ModelCollectionOptions<TItem, TParent>) {
    super(model, fieldName, { ...options, type: FieldType.modelCollection });
    this.modelClass = options.modelClass;

    // Ensure value starts as a real array of models
    this.value = [];
  }

  public override get isDirty(): boolean {
    // Compare serialized shapes (reference compare is useless here)
    return JSON.stringify(this.toJS()) !== JSON.stringify(this.initialValue ?? []);
  }

  public override get array(): TItem[] {
    return this.value;
  }

  public get length(): number {
    return this.value.length;
  }

  public override initValue(collectionValues: unknown[] | null): void {
    this.initialValue = collectionValues ?? [];
    this.value = [];

    for (const v of this.initialValue) {
      this.add(v);
    }
  }

  public override reset(): void {
    this.value = [];
    for (const v of this.initialValue) {
      this.add(v);
    }
    this.error = null;
  }

  public add(initValue: unknown = null): TItem {
    const model = new this.modelClass(this.model);
    model.init(
        initValue !== null && typeof initValue === "object"
            ? (initValue as Record<string, unknown>)
            : null
    );
    this.value.push(model);
    return model;
  }

  public remove(model: TItem): void {
    this.value = this.value.filter((m) => m !== model);
    this.validateSync();
  }

  public toJS(): unknown[] {
    return toJS(this.value).map((m: TItem) => m.toJS());
  }
}