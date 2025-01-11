/**
 * md5
 * Returns the md5 hex hash of a string
 * @param input string
 * @returns Promise<string>
 */
async function md5(input: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode(input) // encode as (utf-8) Uint8Array
    const hashBuffer = await crypto.subtle.digest('MD5', msgUint8) // hash the message
    const hashArray = Array.from(new Uint8Array(hashBuffer)) // convert buffer to byte array
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('') // convert bytes to hex string
  
    return hashHex;
}

export default md5;