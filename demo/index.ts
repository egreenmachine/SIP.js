// tslint:disable: max-classes-per-file, no-shadowed-variable
import {
  Byer,
  Invitation,
  Inviter,
  InviterInviteOptions,
  Registerer,
  Session,
  SessionState,
  UserAgent,
  UserAgentDelegate,
  UserAgentOptions
} from "../lib/api";
import { SessionDescriptionHandler as WebSessionDescriptionHandler } from "../lib/Web";

class MohDemo implements UserAgentDelegate {
  private userAgent: UserAgent;
  private callSession: Session | undefined;
  private mohSession: Session | undefined;
  private senderTrack: any;

  private inviteOptions: InviterInviteOptions = {
    sessionDescriptionHandlerOptions: {
      constraints: {
        audio: true,
        video: false
      }
    }
  };

  constructor() {
    const options: UserAgentOptions = {
      autoStart: true,
      transportOptions: {
        traceSip: true
      }
    };
    this.userAgent = new UserAgent(options);
    this.userAgent.delegate = this;
    if (this.userAgent.transport.isConnected()) {
      this.register();
    } else {
      this.userAgent.transport.once("connected", () => {
        this.register();
      });
    }
  }

  public onInvite(invitiation: Invitation): void {
    this.callSession = invitiation;
    invitiation.accept();
  }

  public invite(targetStr: string): void {
    const target = this.userAgent.makeTargetURI(targetStr);
    if (!target) {
      throw new Error("Invalid Target");
    }
    this.callSession = new Inviter(this.userAgent, target, this.inviteOptions);
    this.callSession.stateChange.on((newState: SessionState) => {
      if (newState === "Established") {
        if (!this.callSession) {
          throw new Error("No callSession");
        }
        if (!this.callSession.sessionDescriptionHandler) {
          throw new Error("No callSession.sdh to get media from");
        }
        const callSdh = (this.callSession.sessionDescriptionHandler as WebSessionDescriptionHandler);
        const track = callSdh.peerConnection.getReceivers()[0].track;
        const stream = new MediaStream();
        stream.addTrack(track);
        const remoteAudio: any = document.getElementById("remoteVideo");
        if (!remoteAudio) {
          throw new Error("No remote audio tag");
        }
        remoteAudio.srcObject = stream;
        remoteAudio.play();
      }
    });
    this.callSession.invite();
  }

  public hold(targetStr?: string): void {
    if (!this.callSession) {
      throw new Error("No Session to hold");
    }
    if (!this.callSession.sessionDescriptionHandler) {
      throw new Error("No SDH for the session");
    }
    this.callSession.invite(
      {sessionDescriptionHandlerModifiers: [this.callSession.sessionDescriptionHandler.holdModifier]
    });
    const callSdh = (this.callSession.sessionDescriptionHandler as WebSessionDescriptionHandler);
    const callReceiver = callSdh.peerConnection.getReceivers()[0];
    if (!callReceiver.track) {
      throw new Error ("No receiver track");
    }
    callReceiver.track.enabled = false;
    const callSender = callSdh.peerConnection.getSenders()[0];
    if (!callSender.track) {
      throw new Error ("No sender track");
    }
    this.senderTrack = callSender.track;
    this.senderTrack.enabled = false;
    if (targetStr) {
      const target = this.userAgent.makeTargetURI(targetStr);
      if (!target) {
        throw new Error("Invalid Target");
      }
      this.mohSession = new Inviter(this.userAgent, target, this.inviteOptions);
      this.mohSession.stateChange.on((newState: SessionState) => {
        if (newState === "Established") {
          if (!this.callSession) {
            throw new Error("No Session to hold");
          }
          if (!this.callSession.sessionDescriptionHandler) {
            throw new Error("No SDH for the session");
          }

          if (!this.mohSession) {
            throw new Error("No Session to hold");
          }
          if (!this.mohSession.sessionDescriptionHandler) {
            throw new Error("No SDH for the session");
          }
          const mohSdh = (this.mohSession.sessionDescriptionHandler as WebSessionDescriptionHandler);
          const mohReceiver = mohSdh.peerConnection.getReceivers()[0];
          callSender.replaceTrack(mohReceiver.track);
        }
      });
      this.mohSession.invite();
    }
  }

  public unhold(): void {
    if (!this.callSession) {
      throw new Error("No Session to hold");
    }
    if (!this.callSession.sessionDescriptionHandler) {
      throw new Error("No SDH for the session");
    }
    const callSdh = (this.callSession.sessionDescriptionHandler as WebSessionDescriptionHandler);
    const callReceiver = callSdh.peerConnection.getReceivers()[0];
    if (!callReceiver.track) {
      throw new Error ("No receiver track");
    }
    callReceiver.track.enabled = true;
    const callSender = callSdh.peerConnection.getSenders()[0];
    if (this.senderTrack) {
      this.senderTrack.enabled = true;
    }
    callSender.replaceTrack(this.senderTrack);
    this.callSession.invite();
    if (this.mohSession) {
      new Byer(this.mohSession).bye();
      this.mohSession = undefined;
    }
  }

  public bye(): void {
    if (!this.callSession) {
      throw new Error("No Session to hold");
    }
    new Byer(this.callSession).bye();
    this.callSession = undefined;
    if (this.mohSession) {
      new Byer(this.mohSession).bye();
      this.mohSession = undefined;
    }
  }

  private register() {
    new Registerer(this.userAgent).register();
  }
}

const mohDemo = new MohDemo();

const target = "target@example.com";
const mohTarget = "moh@example.com";

const startButton = document.getElementById("startCall");
if (!startButton) {
  throw new Error("start button undefined.");
}
startButton.addEventListener("click", () => {
  mohDemo.invite(target);
}, false);

const endButton = document.getElementById("endCall");
if (!endButton) {
  throw new Error("End button undefined.");
}
endButton.addEventListener("click", () => {
  mohDemo.bye();
}, false);

const holdButton = document.getElementById("holdCall");
if (!holdButton) {
  throw new Error("hold button undefined.");
}
holdButton.addEventListener("click", () => {
    mohDemo.hold(mohTarget);
}, false);

const unholdButton = document.getElementById("unholdCall");
if (!unholdButton) {
  throw new Error("unhold button undefined.");
}
unholdButton.addEventListener("click", () => {
    mohDemo.unhold();
}, false);
