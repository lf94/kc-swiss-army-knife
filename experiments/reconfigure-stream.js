const { KittyCADBridge, KittyCADBridgeClient } = require("../index");

KittyCADBridge("0fe6f258-42cd-4dae-be94-35babb0b2e17")
.then(() => KittyCADBridgeClient(4999))
.then((client) => {
  Object.assign(global, client);
  reconfigure_stream({ width: 320, height: 240, fps: 60 });
  done();
});
