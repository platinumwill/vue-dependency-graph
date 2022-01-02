import * as gremlinApi from '@/composables/gremlinManager'

export async function saveDocumentParse (document: Document) {
    const gremlinInvoke = new gremlinApi.GremlinInvoke()

    let result = undefined
    gremlinInvoke
    .addV(gremlinApi.vertexLabels.document)
    .property(gremlinApi.propertyNames.content, document.content)
    .property(gremlinApi.propertyNames.parse, JSON.stringify(document.parse))

    await gremlinApi.submit(gremlinInvoke).then( (gremlinResult) => {
        console.log('document persist result: ', gremlinResult)
        result = gremlinResult
    })

    return document
}

export class Document {
    content: string
    parse: any

    constructor(content:string, parse: any) {
        this.content = content
        this.parse = parse
    }
}
