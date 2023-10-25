// Derived from KCMA https://github.com/KittyCAD/modeling-app
const { WebSocket } = require("ws");
const { RTCPeerConnection } = require("wrtc");
const { randomUUID: uuidv4 } = require('node:crypto');

const te = new TextEncoder();
const send = (payload) => ws.send(JSON.stringify(payload));

const commands = [ "make_axes_gizmo", "make_plane", ];
for (const command of commands) {
  global[command] = (args) => {
    const payload = {
      cmd: {
        type: command,
        ...args
      },
      cmd_id: uuidv4(),
      type: "modeling_cmd_req"
    };
    send(payload);
  };
};

let handlers = {};

let pc;
handlers["ice_server_info"] = (args) => {
  console.log(args);
  pc = new RTCPeerConnection();
  pc.createDataChannel("unreliable_modeling_cmds");
  pc.addEventListener("connectionstatechange", () => {
    console.log("WebRTC connectionstatechange");
    console.log(pc.iceConnectionState);
  });
  pc.setConfiguration({ iceServers: args.ice_servers, iceTransportPolicy: 'relay', });
  pc.addTransceiver("video", {});
  pc.createOffer().then((d) => pc.setLocalDescription(d)).then(() => {
    console.log("sdp_offer");
    // fake the local description. seems the remote server doesnt like the real one.
    const sdp = "v=0\r\no=- 5893866282624579756 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0 1\r\na=extmap-allow-mixed\r\na=msid-semantic: WMS\r\nm=video 9 UDP/TLS/RTP/SAVPF 96 97 102 103 104 105 106 107 108 109 127 125 39 40 45 46 98 99 100 101 112 113 114\r\nc=IN IP4 0.0.0.0\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=ice-ufrag:n8Lm\r\na=ice-pwd:rG3/WDy/+/d8Iktzpd7wJfjZ\r\na=ice-options:trickle\r\na=fingerprint:sha-256 F3:A4:FB:1D:67:A9:4D:F7:64:22:17:65:EE:B1:5C:3D:6D:06:2B:24:E7:3C:B9:F0:14:67:A1:63:49:73:71:17\r\na=setup:actpass\r\na=mid:0\r\na=extmap:1 urn:ietf:params:rtp-hdrext:toffset\r\na=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\na=extmap:3 urn:3gpp:video-orientation\r\na=extmap:4 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\r\na=extmap:5 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay\r\na=extmap:6 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type\r\na=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-timing\r\na=extmap:8 http://www.webrtc.org/experiments/rtp-hdrext/color-space\r\na=extmap:9 urn:ietf:params:rtp-hdrext:sdes:mid\r\na=extmap:10 urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id\r\na=extmap:11 urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id\r\na=sendrecv\r\na=msid:- 4aadfc26-ea3b-47a1-88ec-0931ee03fa32\r\na=rtcp-mux\r\na=rtcp-rsize\r\na=rtpmap:96 VP8/90000\r\na=rtcp-fb:96 goog-remb\r\na=rtcp-fb:96 transport-cc\r\na=rtcp-fb:96 ccm fir\r\na=rtcp-fb:96 nack\r\na=rtcp-fb:96 nack pli\r\na=rtpmap:97 rtx/90000\r\na=fmtp:97 apt=96\r\na=rtpmap:102 H264/90000\r\na=rtcp-fb:102 goog-remb\r\na=rtcp-fb:102 transport-cc\r\na=rtcp-fb:102 ccm fir\r\na=rtcp-fb:102 nack\r\na=rtcp-fb:102 nack pli\r\na=fmtp:102 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42001f\r\na=rtpmap:103 rtx/90000\r\na=fmtp:103 apt=102\r\na=rtpmap:104 H264/90000\r\na=rtcp-fb:104 goog-remb\r\na=rtcp-fb:104 transport-cc\r\na=rtcp-fb:104 ccm fir\r\na=rtcp-fb:104 nack\r\na=rtcp-fb:104 nack pli\r\na=fmtp:104 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42001f\r\na=rtpmap:105 rtx/90000\r\na=fmtp:105 apt=104\r\na=rtpmap:106 H264/90000\r\na=rtcp-fb:106 goog-remb\r\na=rtcp-fb:106 transport-cc\r\na=rtcp-fb:106 ccm fir\r\na=rtcp-fb:106 nack\r\na=rtcp-fb:106 nack pli\r\na=fmtp:106 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f\r\na=rtpmap:107 rtx/90000\r\na=fmtp:107 apt=106\r\na=rtpmap:108 H264/90000\r\na=rtcp-fb:108 goog-remb\r\na=rtcp-fb:108 transport-cc\r\na=rtcp-fb:108 ccm fir\r\na=rtcp-fb:108 nack\r\na=rtcp-fb:108 nack pli\r\na=fmtp:108 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f\r\na=rtpmap:109 rtx/90000\r\na=fmtp:109 apt=108\r\na=rtpmap:127 H264/90000\r\na=rtcp-fb:127 goog-remb\r\na=rtcp-fb:127 transport-cc\r\na=rtcp-fb:127 ccm fir\r\na=rtcp-fb:127 nack\r\na=rtcp-fb:127 nack pli\r\na=fmtp:127 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=4d001f\r\na=rtpmap:125 rtx/90000\r\na=fmtp:125 apt=127\r\na=rtpmap:39 H264/90000\r\na=rtcp-fb:39 goog-remb\r\na=rtcp-fb:39 transport-cc\r\na=rtcp-fb:39 ccm fir\r\na=rtcp-fb:39 nack\r\na=rtcp-fb:39 nack pli\r\na=fmtp:39 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=4d001f\r\na=rtpmap:40 rtx/90000\r\na=fmtp:40 apt=39\r\na=rtpmap:45 AV1/90000\r\na=rtcp-fb:45 goog-remb\r\na=rtcp-fb:45 transport-cc\r\na=rtcp-fb:45 ccm fir\r\na=rtcp-fb:45 nack\r\na=rtcp-fb:45 nack pli\r\na=rtpmap:46 rtx/90000\r\na=fmtp:46 apt=45\r\na=rtpmap:98 VP9/90000\r\na=rtcp-fb:98 goog-remb\r\na=rtcp-fb:98 transport-cc\r\na=rtcp-fb:98 ccm fir\r\na=rtcp-fb:98 nack\r\na=rtcp-fb:98 nack pli\r\na=fmtp:98 profile-id=0\r\na=rtpmap:99 rtx/90000\r\na=fmtp:99 apt=98\r\na=rtpmap:100 VP9/90000\r\na=rtcp-fb:100 goog-remb\r\na=rtcp-fb:100 transport-cc\r\na=rtcp-fb:100 ccm fir\r\na=rtcp-fb:100 nack\r\na=rtcp-fb:100 nack pli\r\na=fmtp:100 profile-id=2\r\na=rtpmap:101 rtx/90000\r\na=fmtp:101 apt=100\r\na=rtpmap:112 red/90000\r\na=rtpmap:113 rtx/90000\r\na=fmtp:113 apt=112\r\na=rtpmap:114 ulpfec/90000\r\na=ssrc-group:FID 2829010225 2319213440\r\na=ssrc:2829010225 cname:yyMz641UXPf2ksJP\r\na=ssrc:2829010225 msid:- 4aadfc26-ea3b-47a1-88ec-0931ee03fa32\r\na=ssrc:2319213440 cname:yyMz641UXPf2ksJP\r\na=ssrc:2319213440 msid:- 4aadfc26-ea3b-47a1-88ec-0931ee03fa32\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\nc=IN IP4 0.0.0.0\r\na=ice-ufrag:n8Lm\r\na=ice-pwd:rG3/WDy/+/d8Iktzpd7wJfjZ\r\na=ice-options:trickle\r\na=fingerprint:sha-256 F3:A4:FB:1D:67:A9:4D:F7:64:22:17:65:EE:B1:5C:3D:6D:06:2B:24:E7:3C:B9:F0:14:67:A1:63:49:73:71:17\r\na=setup:actpass\r\na=mid:1\r\na=sctp-port:5000\r\na=max-message-size:262144\r\n";

    const payload = {
      type: "sdp_offer",
      offer: {
        type: "offer",
        sdp, // pc.localDescription
      }
    };
    send(payload);
  });
  pc.addEventListener("track", (event) => { console.log("track"); });
  pc.addEventListener("icecandidate", (event) => {
    console.log("icecandidate");
    send({ type: "trickle_ice", candidate: event.candidate });
  });
};
handlers["trickle_ice"] = (args) => {
  console.log(args);
  //pc.addIceCandidate(args.candidate);
  main();
};

const cookie = "__Secure-next-auth.session-token=69781ba1-482d-4108-b9a5-90b6ae03bf65";

const url = "wss://api.kittycad.io/ws/modeling/commands?video_res_width=1084&video_res_height=888";
const ws = new WebSocket(url, [], {
  protocolVersion: 13,
  origin: "https://api.kittycad.io",
  headers: {
    "Host": "api.kittycad.io",
    "Cookie": cookie
  },
});
ws.binaryType = "arraybuffer";

ws.on("error", (e) => console.log("error", e));
ws.on("upgrade", (e) => console.log("upgrade"));
ws.on("open", () => console.log("open"));
ws.on("close", (e) => console.log("close", e));

const td = new TextDecoder();
ws.on("message", (chunk) => {
  console.log("message");
  const obj = JSON.parse(td.decode(chunk));
  if (obj.success) {
    console.log(obj.resp.type);
    (handlers[obj.resp.type] || console.log)(obj.resp.data);
  } else console.log(obj);
});

setInterval(() => { console.log("ping"); ws.ping(); }, 10000);
ws.on("pong", () => console.log("pong"));

const main = async () => {
  make_axes_gizmo({ clobber: false, gizmo_mode: true });
  make_plane({
    clobber: false,
    hide: true,
    origin: {x: 0, y: 0, z: 0},
    size: 60,
    x_axis:  {x: 1, y: 0, z: 0},
    y_axis:  {x: 0, y: 1, z: 0}
  });
};
