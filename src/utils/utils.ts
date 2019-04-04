import vuid from 'vuid';
/**
 * generate uid or almost uid
 */
export function generateUid():number {
    // modern browser case
    if(window.crypto) return vuid();
    // IE 11 case
    if((window as any).msCrypto) {
        let array = new Uint32Array(1);
        (window as any).msCrypto.getRandomValues(array);
        return array[0];
    }
    return Date.now();
}