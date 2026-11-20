// Naudojimas: npm run db:seed-demo – atkuria demonstracinį Paantvardžio scenarijų.
import { pool } from "./index";
import { resetDemo } from "../services/demo";

resetDemo()
  .then((r) => {
    console.log("Demonstraciniai duomenys sukurti. Užklausa:", r.requestId);
    return pool.end();
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
