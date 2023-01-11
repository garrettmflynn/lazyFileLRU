import FileProxy from "./src/FileProxy";
import * as visualscript from './external/visualscript/index.esm'

// Create file proxy
const proxy = new FileProxy()
console.log('proxy', proxy)

// create visual object editor
let editor = new visualscript.ObjectEditor()
document.body.insertAdjacentElement('beforeend', editor)

let results_el = document.getElementById("results");

const load = document.getElementById("load")
const fileUrl = document.getElementById("file_url") as HTMLInputElement
const size = document.getElementById("LRUSize")  as HTMLInputElement
const chunk = document.getElementById("requestChunkSize") as HTMLInputElement

if (load && fileUrl && size && chunk) load.onclick = function() {
    let url = fileUrl.value;
    let LRUSize = parseInt(size.value, 10);
    let requestChunkSize = parseInt(chunk.value, 10);
    proxy.load(url, { LRUSize, requestChunkSize }).then(() => {
        console.log('Setting file', proxy.file)
        editor.set(proxy.file)
    })
}

const get = document.getElementById("get")
const pathEl = document.getElementById("path") as HTMLInputElement
if (get && pathEl) get.onclick = async function() {
    let path = pathEl.value;
    proxy.get(path).then(ondata)
}

function ondata (data) {
    if (results_el) {
        results_el.innerHTML = "";
        const result_text = JSON.stringify(data, (k,v) => {
            if (typeof v === 'bigint') {
                return v.toString();
            }
            else if (ArrayBuffer.isView(v))  {
                return [...v];
            }
            return v;
        }, 2);
        results_el.innerText = result_text;
    }
}
