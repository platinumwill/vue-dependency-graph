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
async function queryExistingDocument(documentText: string) {

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

// 儲存 segment 初步翻譯
export const saveInitialSegmentTranslation = (
    sentenceIndex: number
    , document: Document
    ) => {

    const gremlinInvoke = new gremlinApi.GremlinInvoke()

    const existingSentence = document.translatedSentence(sentenceIndex)
    if (existingSentence.length) {
        // 更新
        console.log(existingSentence)
    } else {
        // 新建
        console.log('gremlin invoke: ', gremlinInvoke)
        console.log('document', document)
        console.log('document id', document.id)
        if (!document || !document.id) {
            throw '必須有 Document，而且 Document 必須有 Id'
        }
        gremlinInvoke
        .addV(gremlinApi.translatedVertexLabels.translatedSentence)
        .property('index', sentenceIndex)
        .addE(gremlinApi.translatedVertexLabels.isPartOf)
        .to(new gremlinApi.GremlinInvoke(true).V(document.id))
        gremlinApi.submitAndParse(gremlinInvoke.command()).then((newSentenceData) => {
            console.log('new sentence', newSentenceData)
            // 回傳的是最後建的 edge
        })
        
        console.log(gremlinInvoke.command())
        // PROGRESS
    }
}

export class TranslatedSentence {
    $index: number
    $id: string

    constructor(index: number, id: string) {
        this.$index = index
        this.$id = id
    }

    get index() {
        return this.$index
    }
}
export class Document {
    content: string = ''
    parse: any
    private _id: any
    $translatedSentences: TranslatedSentence[]

    constructor(content?:string, parse?: any, translatedSentences?: TranslatedSentence[]) {
        this.content = content || this.content
        this.parse = parse
        this.$translatedSentences =  translatedSentences || []
    }

    translatedSentence(index: number) {
        // 測試發現如果沒有資料，會回傳空陣列
        return this.$translatedSentences.filter(sentence => {return sentence.index == index})
    }

    public get id() {
        return this._id
    }
    public set id(id: any) {
        this._id = id
    }

    get translatedSentences() {
        return this.$translatedSentences
    }
    set translatedSentences(translatedSentences) {
        this.$translatedSentences = translatedSentences
    }

}