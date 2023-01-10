var worker;

import FileProxy from "./src/FileProxy";

const proxy = new FileProxy()

document.getElementById("load").onclick = function() {
    let url = document.getElementById("file_url").value;
    let LRUSize = parseInt(document.getElementById("LRUSize").value, 10);
    let requestChunkSize = parseInt(document.getElementById("requestChunkSize").value, 10);
    proxy.load(url, { LRUSize, requestChunkSize }).then(() => {

        // Display after load
        console.log('RESOLVED!')
        let results_el = document.getElementById("results");
        results_el.innerHTML = "";
        const result_text = JSON.stringify(event.data, (k,v) => {
            if (typeof v === 'bigint') {
                return v.toString();
            }
            else if (ArrayBuffer.isView(v))  {
                return [...v];
            }
            return v;
        }, 2);
        results_el.innerText = result_text;
    })
}


document.getElementById("get").onclick = async function() {
    let path = document.getElementById("path").value;
    proxy.get(path)
}
