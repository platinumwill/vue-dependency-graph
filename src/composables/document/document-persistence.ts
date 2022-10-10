import * as gremlinApi from '@/composables/gremlinManager'
import { Entity } from '@/composables/gremlinManager'
import { TargetPattern } from '../targetPattern'

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
                , ...sentenceQueryResult
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
    .in().hasLabel(TranslatedSentence.className).in().hasLabel(TranslatedSegment.className).tree()

    return await gremlinApi.submitAndParse(gremlinInvoke).then( (resultData: any) => {
        if (resultData.length > 1) throw '查詢文件有多筆結果，程式或資料有問題'
        if (! resultData.size) return undefined
        if (! (resultData[0] instanceof Map)) throw '查詢結果應該要是 Map，程式或資料有問題'
        console.log('document', resultData[0])
        // PROGRESS
        return
        const queryResult = resultData[gremlinApi.valueKey]
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
        const translatedSentences: TranslatedSentence[] = []
        if (! (Array.isArray(sentenceQueryResult))) throw '查詢結果解析結果有問題'
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
    targetPattern: TargetPattern
    , document: Document
    ) {

    if (targetPattern.token.sentence?.index == undefined) throw '資料有問題'

    const sentenceIndex: number = targetPattern.token.sentence?.index
    const selectedTargetPatternId: bigint = targetPattern.selection.selected.pieces[0].mappedGraphVertexId
    const gremlinInvoke = new gremlinApi.GremlinInvoke()

    const sentenceVertexAlias = 'translatedSentence'

    // 存檔
    const existingSentence = document.translatedSentence(sentenceIndex)
    if (existingSentence) {
        // 更新 sentence
        console.log(existingSentence)
        gremlinInvoke.V(existingSentence.id)
        .as(sentenceVertexAlias)
    } else {
        // 新建 TranslatedSentence
        if (!document || !document.id) {
            throw '必須有 Document，而且 Document 必須有 Id'
        }
        // 檢查 sentence index 有沒有重覆(有重覆的話會有例外)
        queryTranslatedSentences(document.id)

        gremlinInvoke
        // setence
        .addV(gremlinApi.translatedVertexLabels.translatedSentence) // sentence
        .as(sentenceVertexAlias)
        .property(TranslatedSentence.propertyNames.index, sentenceIndex)
        .addE(gremlinApi.translatedEdgeLabels.isPartOf)
        .to(new gremlinApi.GremlinInvoke(true).V(document.id)) // sentence -> document
    }
    // TODO 還要考慮 segment 更新的狀況
    gremlinInvoke
    // segment
    .addV(gremlinApi.translatedVertexLabels.translatedSegment) // segement
    .property(TranslatedSegment.propertyNames.rootTokenIndex, targetPattern.token.indexInSentence)
    .addE(gremlinApi.translatedEdgeLabels.isPartOf)
    .to(sentenceVertexAlias) // segment -> sentence
    .outV() // segment
    .addE(gremlinApi.translatedEdgeLabels.translateWith)
    .to(new gremlinApi.GremlinInvoke(true).V(selectedTargetPatternId)) // segment -> target pattern
    .outV()
    // TODO 還要存 text pieces
    gremlinApi.submitAndParse(gremlinInvoke.command()).then((objects) => {
        console.log('sentence saved', objects)
        // 回傳的是新建的 vertex
    })
}

class TranslatedSegment {
    $rootTokenIndex: bigint

    constructor(rootTokenIdx: bigint) {
        this.$rootTokenIndex = rootTokenIdx
    }
    static propertyNames = Object.freeze({
        rootTokenIndex: 'rootTokenIndex'
    })
    static className = 'TranslatedSegment'
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
    get id() {
        return this.$id
    }

    static propertyNames = Object.freeze({
        index: 'index'
    })
    static className = 'TranslatedSentence'
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

    translatedSentence(index: number): TranslatedSentence {
        // 測試發現如果沒有資料，會回傳空陣列
        const matchingSentenceArray = this.$translatedSentences.filter(sentence => {return sentence.index == index})
        return (undefined || matchingSentenceArray[0])
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