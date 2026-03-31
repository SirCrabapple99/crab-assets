async function uploadSave() {
    try {

        /** @type {FileSystemFileHandle[]} */
        const response = await fetch('https://cdn.jsdelivr.net/gh/SirCrabapple99/crab-assets@main/multifile/99000/fixSaving.zip');
        const blob = await response.blob();
        const fileBlob = new File([blob], "fixSaving.zip", {
            type: blob.type
        })

        const zipFile = await JSZip.loadAsync(fileBlob)
        const settingsFile = zipFile.file(/settings\.jkr$/)[0];
        const arrayBuffer = await settingsFile.async("arrayBuffer");
        const contents = new Int8Array(arrayBuffer);
        const SETTINGS_PERMS = 33206;

        // slop slop slop slop slop
        let injected = false
        const originalTransaction = IDBDatabase.prototype.transaction;
        IDBDatabase.prototype.transaction = function (...args) {
            const tx = originalTransaction.apply(this, args);
            if (args[1] === 'readwrite') {
                const originalObjectStore = tx.objectStore.bind(tx);
                tx.objectStore = function (name) {
                    const store = originalObjectStore(name);
                    if (name === 'FILE_DATA') {
                        const originalPut = store.put.bind(store);
                        const originalAdd = store.add.bind(store);
                        const inject = (fn, data, key) => {
                            if (key === '/home/web_user/love/game/settings.jkr') {
                                injected = true;
                                IDBDatabase.prototype.transaction = originalTransaction; // restore
                                data = {
                                    mode: SETTINGS_PERMS,
                                    timestamp: new Date(),
                                    contents
                                };
                            }
                            return fn(data, key);
                        };
                        store.put = (data, key) => inject(originalPut, data, key);
                        store.add = (data, key) => inject(originalAdd, data, key);
                    }
                    return store;
                };
            }
            return tx;
        };
        window.localStorage.setItem('balatroPrepState', 'fixed')
    } catch (err) {
        console.error(err)
    }

}

window.addEventListener('keydown', (e) => {
    if (e.code == 'Equal') {
        window.localStorage.setItem('balatroPrepState', null)
        window.location.reload()
    }
})