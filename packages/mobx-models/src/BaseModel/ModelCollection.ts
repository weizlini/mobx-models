import type BaseModel from "./BaseModel";
import Field, { FieldOptions, FieldType } from "./Field";
import { toJS } from "mobx";

export interface ModelCollectionOptions<TItem extends BaseModel, TParent extends BaseModel>
    extends Omit<FieldOptions<TParent, TItem[]>, "type"> {
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

  /**
   * We keep the raw init payload separately so `isDirty` can compare stable shapes.
   */
  private __initialSerialized: unknown[] = [];

  constructor(model: TParent, fieldName: string, options: ModelCollectionOptions<TItem, TParent>) {
    super(model, fieldName, { ...options, type: FieldType.modelCollection });
    this.modelClass = options.modelClass;

    this.value = [] as any;
    this.initialValue = [] as any;
  }

  public override get isDirty(): boolean {
    return JSON.stringify(this.toJS()) !== JSON.stringify(this.__initialSerialized);
  }

  public override get array(): TItem[] {
    return this.value;
  }

  public get length(): number {
    return this.value.length;
  }

  public override initValue(collectionValues: unknown[] | null): void {
    this.__initialSerialized = collectionValues ?? [];

    this.value = [] as any;
    this.initialValue = [] as any;

    for (const v of this.__initialSerialized) {
      this.add(v);
    }

    this.initialValue = toJS(this.value) as any;
  }

  public override reset(): void {
    this.value = [] as any;
    for (const v of this.__initialSerialized) {
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
    this.value = this.value.filter((m) => m !== model) as any;
    this.validateSync();
  }

  public toJS(): unknown[] {
    return toJS(this.value).map((m: TItem) => m.toJS());
  }
}