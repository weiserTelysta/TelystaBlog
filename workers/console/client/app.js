import { startStarfield } from '../../../src/components/starfield/starfieldRuntime';
import '../../../src/components/starfield/StarfieldBackground.css';

const canvas = document.querySelector('#account-starfield canvas');
let stop;
function mount() {
 if (canvas && !stop) stop = startStarfield(canvas, 'subtle');
}
function unmount() {
 stop?.();
 stop = undefined;
}
mount();
// The session request uses top-level await. Start the background first so slow
// authentication responses cannot leave the account surface without its stars.
void import('../public/app.js');
window.addEventListener('pagehide', unmount);
window.addEventListener('pageshow', mount);
