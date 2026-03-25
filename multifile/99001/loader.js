// the split pack combiner is ai slop because im stupid
async function loadPck() {
    const partNames = [
        'AGAFABH.pck.part.aa',
        'AGAFABH.pck.part.ab',
        'AGAFABH.pck.part.ac',
        'AGAFABH.pck.part.ad',
        'AGAFABH.pck.part.ae',
        'AGAFABH.pck.part.af',
        'AGAFABH.pck.part.ag',
        'AGAFABH.pck.part.ah',
        'AGAFABH.pck.part.ai',
    ];

    const base = 'https://cdn.jsdelivr.net/gh/SirCrabapple99/crab-assets@main/multifile/99001';

    const parts = await Promise.all(
        partNames.map(name => fetch(base + name).then(r => r.arrayBuffer()))
    );
    
    const totalLength = parts.reduce((sum, b) => sum + b.byteLength, 0);
    const merged = new Uint8Array(totalLength);
    let offset = 0;
    for (const buf of parts) {
        merged.set(new Uint8Array(buf), offset);
        offset += buf.byteLength;
    }
    
    pckBlobUrl = URL.createObjectURL(new Blob([merged], { type: 'application/octet-stream' }));
}
