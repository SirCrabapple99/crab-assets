// new godot recombine split stuff and whatever else script
async function recombineFiles(files) {
    const chunks = await Promise.all(
        files.map(file => file.arrayBuffer())
    )
    return new Blob(chunks)
}

const Fetch = window.fetch
window.fetch = async function (url, opts) {
    const letters = 'abcdefghijklmnopqrstuvwxyz'
    // make sure your pck and side wasm is .part.a at the end of it
    if (typeof url == 'string' && (url.endsWith('.pck') || url.endsWith('.side.wasm'))) {
        const chunks = []
        let i = 0
        while (true) {
            const fileExtensionThingy = 'part.a' + letters[i++]
            const res = await Fetch(url + '.' + fileExtensionThingy, opts)
            if (!res.ok) break
            chunks.push(await res.arrayBuffer())
        }
        const blob = new Blob(chunks)
        return new Response(blob)
    }
    return Fetch(url, opts)
};