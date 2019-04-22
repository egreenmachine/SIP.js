import { Simple } from "../lib/Web/Simple";

const options = {
  media: {
    local: {
      video: document.getElementById("localVideo")
    },
    remote: {
      video: document.getElementById("remoteVideo"),
      // This is necessary to do an audio/video call as opposed to just a video call
      audio: document.getElementById("remoteVideo")
    }
  },
  ua: {
    uri: "usernanme",
    authorizationUser: "authusername",
    password: "password",
    traceSip: true
  }
};

const target = "uri";

const simple = new Simple(options);

const startButton = document.getElementById("startCall");
if (!startButton) {
  throw new Error("start button undefined.");
}
startButton.addEventListener("click", () => {
  simple.call(target);
}, false);

const endButton = document.getElementById("endCall");
if (!endButton) {
  throw new Error("End button undefined.");
}
endButton.addEventListener("click", () => {
    simple.hangup();
}, false);

const holdButton = document.getElementById("holdCall");
if (!holdButton) {
  throw new Error("hold button undefined.");
}
holdButton.addEventListener("click", () => {
    simple.hold();
}, false);

const unholdButton = document.getElementById("unholdCall");
if (!unholdButton) {
  throw new Error("unhold button undefined.");
}
unholdButton.addEventListener("click", () => {
    simple.unhold();
}, false);

simple.on("registered", () => {
  alert("Registered");
});

simple.on("ringing", () => {
  simple.answer();
});
