const {query}=require("./dist/db");
query("SELECT name, status, last_seen FROM profiles ORDER BY last_seen DESC NULLS LAST LIMIT 5")
  .then(r=>{console.log(JSON.stringify(r.rows,null,2));process.exit()})
  .catch(e=>{console.error(e);process.exit(1)});
