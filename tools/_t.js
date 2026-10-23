const {spawn} = require("child_process");
const paths = [
 "C:/Program Files (x86)/Microsoft Edge/Application/msedge.exe",
 "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
];
for (const p of paths){
  const c = spawn(p, ["--version"], {stdio:"ignore"});
  c.on("error", e=>console.log(JSON.stringify(p), "ERR", e.code));
  c.on("exit", code=>console.log(JSON.stringify(p), "exit", code));
}
