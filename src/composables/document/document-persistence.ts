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
export async function queryExistingParse(documentText: string) {

    const gremlinInvoke = new gremlinApi.GremlinInvoke()

    gremlinInvoke
    .V()
    .has('content', new gremlinApi.GremlinInvoke(true).call('textFuzzy', documentText))

    return await gremlinApi.submit(gremlinInvoke).then( (resultData: any) => {
        const queryResult = resultData[gremlinApi.valueKey]
        if (queryResult.length > 1) {
            const error = '查詢結果有多筆，資料不正確'
            console.error(error)
            throw error
        }
        if (queryResult.length <= 0) {
            return undefined
        }
        // 以下就是查詢結果剛好有 1 筆的正常流程
        const parseJsonString = queryResult[0][gremlinApi.valueKey][gremlinApi.keys.properties][gremlinApi.propertyNames.parse][0][gremlinApi.keys.value]['value']
        return JSON.parse(parseJsonString)
    }).catch( (error) => {
        console.error(error)
        throw error
    })
}

export class Document {
    content: string
    parse: any

    constructor(content:string, parse: any) {
        this.content = content
        this.parse = parse
    }
}
