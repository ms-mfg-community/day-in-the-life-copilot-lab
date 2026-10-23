import { useEffect } from "react";
import { Bench } from "./components/Bench";
import { Manual } from "./components/Manual";
import { Rail } from "./components/Rail";
import { connectEvents, refreshMeta, refreshTree } from "./controller";

export function App(): JSX.Element {
  useEffect(() => {
    connectEvents();
    void refreshMeta();
    void refreshTree();
  }, []);

  return (
    <div className="app">
      <Rail />
      <Manual />
      <Bench />
    </div>
  );
}
