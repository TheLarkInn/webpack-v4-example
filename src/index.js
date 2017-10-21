import foo from "./a";
import { b } from "./b";

Promise.all([
  import('./a-lazy'),
  import('./b-lazy')
]).then(([defaulted, { lazy }]) => {
  console.log(defaulted.default, lazy);
})
