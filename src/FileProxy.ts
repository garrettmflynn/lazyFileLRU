import worker from './adv_worker'

type FileProxyOptions = {
    LRUSize?: number
    requestChunkSize?: number
}


const defaultRequestChunkSize = 1024
const defaultLRUSize = 100

class FileProxy {

    url: string
    worker: Worker;
    options: FileProxyOptions = {}

    #toResolve = {}

    constructor(url?, options?: FileProxyOptions) {

        this.set(url, options)

        // Initialize Worker
        if (window && window.Worker) {
            const worker = new Worker("./dist/adv_worker.js") //, { type : 'module' } );
            this.worker = worker
            console.log('Got worker', worker)
            this.worker.addEventListener("message", (event) => {
                console.log("EVENT:", event);
                console.log('GOT', event.data, this.#toResolve[event.data])
                const resolve = this.#toResolve[event.data.lazyFileProxyId]
                if (resolve) resolve(event.data)
                else console.error('Message was not awaited...')
            })
        } else {
            console.log("Workers are not supported");
        }
    }

    set = (url?: string, options?: FileProxyOptions) => {
        if (url) this.url = url
        if (options) this.options = options
    }

    get = (path = '/') => {
        const o = {action: "get", payload: { path }}
        this.send(o)
    }

    load = async (url, options) => {
        this.set(url, options)
        let LRUSize = this.options.LRUSize ?? defaultLRUSize;
        let requestChunkSize = this.options.requestChunkSize ?? defaultRequestChunkSize
        return this.send({action: "load", payload: {url: this.url, LRUSize, requestChunkSize}})
    }

    send = (o) => {
        return new Promise(resolve => {
            const lazyFileProxyId = Math.random().toString(36).substring(7);
            this.#toResolve[lazyFileProxyId] = resolve
            o.lazyFileProxyId = lazyFileProxyId
            console.log('Worker', this.worker)
            this.worker.postMessage(o);
        }) 
    }
}

export default FileProxy