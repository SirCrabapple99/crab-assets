/**
 * @param {string} version - The name of the version to run.
 */
function runVersion(version) {
    loadCachedGame(version).then(
        /**
         * 
         * @param {Blob} game - The zip data of the game
         */
        async (game) => {
            const PREFIX = "Balatro_" + version + "_";

            const originalOpen = indexedDB.open;
            const originalDeleteDatabase = indexedDB.deleteDatabase;

            indexedDB.open = function (name, version) {
                const prefixedName = PREFIX + name;
                return version !== undefined
                    ? originalOpen.call(this, prefixedName, version)
                    : originalOpen.call(this, prefixedName);
            };

            indexedDB.deleteDatabase = function (name) {
                const prefixedName = PREFIX + name;
                return originalDeleteDatabase.call(this, prefixedName);
            };

            document.body.innerHTML = ""
            const canvas = document.createElement("canvas")
            canvas.id = "canvas"
            canvas.style.cssText = "width:100%;height:100%;display:block;"
            document.body.appendChild(canvas)
            document.body.classList.add("game")

            const data = new Uint8Array(await game.arrayBuffer())

            window.Module = undefined
            const Module = {
                INITIAL_MEMORY: 268435456,
                canvas: canvas,
                printErr: console.error,
                arguments: ["game.love"], // 1st argument is the path of the package
                preRun: [
                    function () { // Load game.love into the fs
                        Module.addRunDependency("fp game.love");
                        var ptr = Module.getMemory(data.length);
                        Module['HEAPU8'].set(data, ptr); // Put data after the chunk of memory
                        Module.FS_createDataFile('/', "game.love", data, true, true, true); // Add the file
                        Module.removeRunDependency("fp game.love");
                    }
                ]
            }
            // The package exports the Love function
            var s = document.createElement('script');
            s.type = 'text/javascript';
            s.src = "run/11.5/love.min.js";
            s.async = true;
            s.onload = function () {
                console.log('loaded script')
                Love(Module);
            };
            s.onerror = function (e) {
                console.error(e)
            }
            document.body.appendChild(s);

            if (prepState == 'refresh') {
                const loadingScreen = document.createElement('div')
                loadingScreen.style.cssText = "display: grid; place-content: center; left: 15%; width: 70%; height: 100%; position: absolute; font-size: 2em"
                loadingScreen.innerHTML = `Loading game. Don't leave the page, if it breaks hit = on your keyboard to fix (will reset data)`
                document.body.appendChild(loadingScreen)
                setTimeout(() => {
                    window.localStorage.setItem('balatroPrepState', 'ready');
                    location.reload()
                }, 5000)
            } else if (prepState != 'ready') {
                const loadingScreen = document.createElement('div')
                loadingScreen.style.cssText = "display: grid; place-content: center; left: 15%; width: 70%; height: 100%; position: absolute; font-size: 2em"
                loadingScreen.innerHTML = `Loading game. Don't leave the page, if it breaks hit = on your keyboard to fix (will reset data)`
                document.body.appendChild(loadingScreen)
                setTimeout(() => {
                    window.localStorage.setItem('balatroPrepState', 'upload');
                    location.reload()
                }, 5000)
            }
        },
        (error) => {
            throw new Error("Unknown game version '" + version + "'")
        }
    )
}