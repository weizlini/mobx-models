import { mobxModelsVersion } from 'mobx-models';

export default function Page() {
  return (
    <main>
      <h1>mobx-models demo</h1>
      <p>Library version (workspace): {mobxModelsVersion}</p>
    </main>
  );
}
