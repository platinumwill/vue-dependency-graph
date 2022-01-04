import * as gremlinApi from '@/composables/gremlinManager'

export async function retrieveDocument(documentText: string, spacyFormatParseProviderName: string, spacyFormatParseProvider: any) {
    if (spacyFormatParseProviderName != undefined) { // 有名字，就可以視同解析解果會被儲存
        let document: Document|undefined = undefined
        await queryExistingDocument(documentText).then( (queryResult) => {
            document = queryResult
        })
        if (document != undefined) {
            console.log('existing document retrieved: ', document)
            return document
        } else {
            return spacyFormatParseProvider.parse(documentText)
                .then(saveDocumentParse)
                .then( (newlySavedDocument: Document) => {
                    return newlySavedDocument
                })
        }
    }
    return spacyFormatParseProvider.parse(documentText)
}

export async function saveDocumentParse (document: Document) {
    const gremlinInvoke = new gremlinApi.GremlinInvoke()

    gremlinInvoke
    .addV(gremlinApi.vertexLabels.document)
    .property(gremlinApi.propertyNames.content, document.content)
    .property(gremlinApi.propertyNames.parse, JSON.stringify(document.parse))

    await gremlinApi.submit(gremlinInvoke).then( (gremlinResult: any) => {
        console.log('document persist result: ', gremlinResult)
        const id = gremlinResult[gremlinApi.keys.value][0][gremlinApi.keys.value][gremlinApi.keys.id][gremlinApi.keys.value]
        document.id = id
    })

    return document
}
export async function queryExistingDocument(documentText: string) {

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
        const parse = JSON.parse(parseJsonString)
        const content = queryResult[0][gremlinApi.valueKey][gremlinApi.keys.properties][gremlinApi.propertyNames.content][0][gremlinApi.keys.value]['value']
        const id = queryResult[0][gremlinApi.valueKey][gremlinApi.keys.id][gremlinApi.keys.value]
        const document = new Document(content, parse)
        document.id = id
        console.log('document query result: ', document)
        return document
    }).catch( (error) => {
        console.error(error)
        throw error
    })
}

export class Document {
    content: string
    parse: any
    private _id: any

    constructor(content:string, parse: any) {
        this.content = content
        this.parse = parse
    }

    public get id() {
        return this._id
    }

    public set id(id: any) {
        this._id = id
    }

}
