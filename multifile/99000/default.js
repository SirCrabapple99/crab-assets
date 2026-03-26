// this file part recombining script is 99% ai slop because i genuinely cant figure out how tf i recombine the output from split
const originalFetch = window.fetch;
function loadInWorker(partNames, base, mimeType) {
    return new Promise((resolve, reject) => {
        const workerCode = `
            self.onmessage = async function(e) {
                const { partNames, base, mimeType } = e.data;
                try {
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
                    self.postMessage({ buffer: merged.buffer }, [merged.buffer]);
                } catch(err) {
                    self.postMessage({ error: err.message });
                }
            };
        `;
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));
        worker.onmessage = (e) => {
            if (e.data.error) {
                reject(new Error(e.data.error));
            } else {
                resolve(e.data.buffer);
            }
            worker.terminate();
        };
        worker.postMessage({ partNames, base, mimeType });
    });
}

// slop ends here
// check if browser is prepped
let prepState = window.localStorage.getItem('balatroPrepState')
console.log(prepState)

async function prep() {
    if (prepState == 'refresh' || prepState == 'ready') {
        runVersion('vanilla')
    } else if (prepState == 'upload') {
        uploadSave()
    } else {
        downloadGameData()
    }
}

document.addEventListener('keydown', function (e) {
    if (e.code == 'Equal') {
        window.localStorage.removeItem('balatroPrepState')
        console.log('reset state')
        location.reload()
    }
})

let defaultEXE

async function downloadGameData() {
    // load the default exe
    try {
        base = document.querySelector('head > base').getAttribute('href') + '/'
        console.log('downloading default exe')
        const blob = await loadInWorker([
            'balatro.part.aa',
            'balatro.part.ab',
            'balatro.part.ac',
            'balatro.part.ad',
        ], base, 'application/octet-stream');
        await new Promise(resolve => setTimeout(resolve, 100));
        defaultEXE = new File([blob], "balatro.exe", { type: 'application/octet-stream' })
        console.log('successfully downloaded default exe')
        buildDefault()

    } catch (err) {
        showError(err instanceof Error ? err.message : String(err))
        console.error(`error fetching default exe: ${err}`)
    }
}

async function buildDefault() {
    try {
        console.log('building default exe')
        let name = 'vanilla'
        game = await buildFromSource(defaultEXE, {});
        await saveGameToCache(game, name);
        console.log('successfully built default exe')
        await loadVersion('vanilla')
        runVersion('vanilla')

    } catch (err) {
        showError(err instanceof Error ? err.message : String(err))
        console.error(err)
    }
}

async function uploadSave() {
    await loadVersion('vanilla')
    await deleteSaveJustInCase()
    /** @type {FileSystemFileHandle[]} */
    const response = await fetch('./fixSaving.zip');
    const blob = await response.blob();
    const fileBlob = new File([blob], "fixSaving.zip", { type: blob.type })

    const zipFile = await JSZip.loadAsync(fileBlob)

    const DIR_PERMS = 16832
    const FILE_PERMS = 33152
    const SETTINGS_PERMS = 33206

    const save_data_id = "Balatro_" + loaded_game_id + "_/home/web_user/love"

    const request = indexedDB.open(save_data_id);
    /** @type {IDBDatabase} */
    const db = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    db.onerror = console.error

    const zip_contents = {}

    for (const file of Object.values(zipFile.files)) {
        if (file.name.endsWith("/")) {
            file.name = file.name.slice(0, -1)
        }
        if (file.dir) {
            zip_contents["/home/web_user/love/game/" + file.name] = {
                mode: DIR_PERMS,
                timestamp: file.date
            }
        } else {
            const arrayBuffer = await zipFile.file(file.name).async("arrayBuffer")

            const contents = new Int8Array(arrayBuffer)

            zip_contents["/home/web_user/love/game/" + file.name] = {
                mode: file.name == "settings.jkr" ? SETTINGS_PERMS : FILE_PERMS,
                timestamp: file.date,
                contents: contents
            }
        }
    }

    // Open the "FILE_DATA" object store
    let tx = db.transaction('FILE_DATA', 'readwrite');
    let store = tx.objectStore('FILE_DATA');

    await new Promise((resolve, reject) => {
        const cursorRequest = store.openCursor();

        cursorRequest.onsuccess = async (event) => {
            /** @type {IDBCursorWithValue} */
            const cursor = event.target.result;
            if (cursor) {
                await unwrapIDBRequest(store.delete(cursor.key))

                cursor.continue();
            } else {
                resolve();
            }
        };
        cursorRequest.onerror = () => reject(cursorRequest.error);
    });

    tx = db.transaction('FILE_DATA', 'readwrite');

    tx.onerror = console.error

    store = tx.objectStore('FILE_DATA');

    store.add({
        mode: DIR_PERMS,
        timestamp: new Date()
    }, "/home/web_user/love/game")

    const promises = []

    for (const [name, data] of Object.entries(zip_contents)) {
        store.add(data, name)
    }

    await Promise.all(promises);

    db.close()

    window.localStorage.setItem('balatroPrepState', 'refresh')
    location.reload()
}

async function deleteSaveJustInCase() {
    await Promise.resolve()

    const save_data_id = "Balatro_" + loaded_game_id + "_/home/web_user/love"

    const request = indexedDB.open(save_data_id);
    /** @type {IDBDatabase} */
    const db = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    let tx = db.transaction('FILE_DATA', 'readwrite');
    let store = tx.objectStore('FILE_DATA');

    await new Promise((resolve, reject) => {
        const cursorRequest = store.openCursor();

        cursorRequest.onsuccess = async (event) => {
            /** @type {IDBCursorWithValue} */
            const cursor = event.target.result;
            if (cursor) {
                await unwrapIDBRequest(store.delete(cursor.key))

                cursor.continue();
            } else {
                resolve();
            }
        };
        cursorRequest.onerror = () => reject(cursorRequest.error);
    });
}

window.addEventListener('load', (e) => {
    prep()
})