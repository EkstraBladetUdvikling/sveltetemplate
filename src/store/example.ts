import { type Readable, writable, type Writable } from 'svelte/store';

type ValueType = boolean;

class ExampleStore {
  protected _writableValue: Writable<ValueType> = writable(false);

  constructor() {
    this._writableValue.set(true);
  }

  get readableValue(): Readable<ValueType> {
    return { subscribe: this._writableValue.subscribe };
  }
}

export default new ExampleStore();
