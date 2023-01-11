import workerURI from './adv.worker'
import * as global from './global'

type FileProxyOptions = {
    LRUSize?: number
    requestChunkSize?: number
}

// const isPromise = (o) => typeof o === 'object' && typeof o.then === 'function'


const defaultRequestChunkSize = 1024
const defaultLRUSize = 100

class FileProxy {

    url: string
    worker: Worker;
    options: FileProxyOptions = {}

    #toResolve = {}
    file: any = {}

    constructor(url?, options?: FileProxyOptions) {

        this.set(url, options)

        // Initialize Worker
        if (window && window.Worker) {
            this.worker = new Worker(workerURI) 
            this.worker.addEventListener("message", (event) => {
                const info = this.#toResolve[event.data[global.id]]
                if (info) {
                    info.resolve(event.data.payload)
                    console.log(`[hdf5-io]: File proxy info loaded in ${Date.now() - info.timestamp}ms`)
                }
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

    get = async (path = '/') => {
        const o = {action: "get", payload: { path }}
        const raw = await this.send(o) as any

        if (raw.type === 'error') throw new Error(raw.value)

        let targets = {
            file: this.file
        }

        const split = path.split('/').filter(v => !!v)
        const key = split.pop()
        for (let str of split) {
            for (let key in targets) targets[key] = await targets[key][str]
        }

        // Create entry in private file
        if (key) {
            const desc = Object.getOwnPropertyDescriptor(targets.file, key)
            if (!desc || desc.get) Object.defineProperty(targets.file, key, {value: {}, enumerable: true}) // redefine getter with empty object that will be filled now
            targets.file = targets.file[key]
        }

        // Proxy private file properties (which are always resolved) 
        if (raw.attrs) {
            for (let key in raw.attrs) {
                Object.defineProperty(targets.file, key, {
                    get: () => raw.attrs[key].value,
                    enumerable: true,
                    configurable: true // Can be redeclared
                })
            }
        }
        
        if (raw.children) {
            for (let key of raw.children) {
                Object.defineProperty(targets.file, key, {
                    get: () => {
                        const desc = Object.getOwnPropertyDescriptor(targets.file, key)
                        if (!desc || desc.get) {
                            const updatedPath = (path && path !== '/') ? `${path}/${key}` : key
                            return this.get(updatedPath) // Replaces the new value for you
                        } else return targets.file[key] // Just get the value
                    },
                    enumerable: true,
                    configurable: true // Can be redeclared
                })
            }
        }

        // return raw
        return targets.file
    }

    load = async (url, options) => {
        this.set(url, options)
        let LRUSize = this.options.LRUSize ?? defaultLRUSize;
        let requestChunkSize = this.options.requestChunkSize ?? defaultRequestChunkSize
        const success = await this.send({action: "load", payload: {url: this.url, LRUSize, requestChunkSize}})
        if (success) return this.get()
        else console.error('File could not be loaded...')
    }

    send = (o) => {
        return new Promise(resolve => {
            const id = Math.random().toString(36).substring(7);
            this.#toResolve[id] = {resolve, timestamp: Date.now()}
            o[global.id] = id
            this.worker.postMessage(o);
        }) 
    }
}

export default FileProxy