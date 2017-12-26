import foo from "./a";
import { b } from "./b";

if (Math.random(1 * Date.now().toFixed(0)) % 2) {
  Promise.all([
    import('./a-lazy'),
    import('./b-lazy')
  ]).then(([defaulted, { lazy }]) => {
    console.log(defaulted.default, lazy);
  })
}
