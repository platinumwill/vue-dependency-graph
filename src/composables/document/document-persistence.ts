import * as gremlinApi from '@/composables/gremlinManager'
import { Entity } from '@/composables/gremlinManager'

export async function retrieveDocument(documentText: string, spacyFormatParseProviderName: string, spacyFormatParseProvider: any) {
    if (spacyFormatParseProviderName != undefined) { // 有名字，就可以視同解析解果會被儲存
        let document: Document|undefined = undefined
        await queryExistingDocument(documentText).then( (queryResult) => {
            document = queryResult
            return document
        } ).then( (document) => {
            if (! document) throw 'document 為空值，資料錯誤'
            return queryTranslatedSentences(document.id)
        } ).then( (sentenceQueryResult: any) => {
            console.log(sentenceQueryResult)
            document?.translatedSentences.splice(
                0
                , document.translatedSentences.length
                , sentenceQueryResult
                )
            return document
        } )
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
async function queryTranslatedSentences(documentId: number): Promise<TranslatedSentence[]> {
    const gremlinInvoke = new gremlinApi.GremlinInvoke()
    gremlinInvoke
    .V(documentId).in().hasLabel(gremlinApi.vertexLabels.translatedSentence)
    return await gremlinApi.submitAndParse(gremlinInvoke).then( (sentenceQueryResult) => {
        const translatedSentences: any[] = []
        sentenceQueryResult.forEach( (queryResultEntry) => {
            if (! (queryResultEntry instanceof Entity)) throw '參數沒有控制好，這裡只能有 Entity'
            const translatedSentence = new TranslatedSentence(queryResultEntry)
            translatedSentences.push(translatedSentence)
        } )
        // 檢查 sentence index 有沒有重覆
        const sentenceIndexArray = translatedSentences.map( (element: TranslatedSentence) => {return element.index} )
        const indexDuplicated = new Set(sentenceIndexArray).size !== sentenceIndexArray.length
        console.log('indexDuplicated', indexDuplicated)
        if (indexDuplicated) throw 'Document 裡的不同 sentence 的 index 有重覆，資料有問題'

        return translatedSentences
    })
}

// 儲存 segment 初步翻譯
export function saveInitialSegmentTranslation (
    sentenceIndex: number
    , document: Document
    ) {

    const gremlinInvoke = new gremlinApi.GremlinInvoke()

    const existingSentence = document.translatedSentence(sentenceIndex)
    if (existingSentence.length) {
        // 更新 sentence
        console.log(existingSentence)
    } else {
        // 新建 TranslatedSentence
        if (!document || !document.id) {
            throw '必須有 Document，而且 Document 必須有 Id'
        }
        // 檢查 sentence index 有沒有重覆(有重覆的話會有例外)
        queryTranslatedSentences(document.id)

        // 存檔
        gremlinInvoke
        .addV(gremlinApi.translatedVertexLabels.translatedSentence)
        .property(TranslatedSentence.propertyNames.index, sentenceIndex)
        .addE(gremlinApi.translatedVertexLabels.isPartOf)
        .to(new gremlinApi.GremlinInvoke(true).V(document.id))
        .outV()
        gremlinApi.submitAndParse(gremlinInvoke.command()).then((objects) => {
            console.log('sentence saved', objects)
            // 回傳的是新建的 vertex
        })
    }
}

export class TranslatedSentence {
    $index: number
    $id: number

    constructor(entity: Entity) {
        this.$id = entity.id
        this.$index = 
        entity.propertyJson[TranslatedSentence.propertyNames.index][0][gremlinApi.keys.value][gremlinApi.keys.propertyValue][gremlinApi.keys.value]
    }

    get index() {
        return this.$index
    }

    static propertyNames = Object.freeze({
        index: 'index'
    })
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