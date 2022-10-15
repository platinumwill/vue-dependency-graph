import * as gremlinApi from '@/composables/gremlinManager'
import { Entity } from '@/composables/gremlinManager'
import { TargetPattern } from '../targetPattern'

export async function retrieveDocument(documentText: string, spacyFormatParseProviderName: string, spacyFormatParseProvider: any) {
    if (spacyFormatParseProviderName != undefined) { // 有名字，就可以視同解析解果會被儲存
        let document: Document|undefined = undefined
        await queryExistingDocument(documentText).then( (queryResult) => {
            document = queryResult
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
    .has(gremlinApi.propertyNames.content, new gremlinApi.GremlinInvoke(true).call('textFuzzy', documentText))
    .until(
        new gremlinApi.GremlinInvoke(true)
        .__not(new gremlinApi.GremlinInvoke(true).__in())
    )
    .repeat(
        new gremlinApi.GremlinInvoke(true).__in()
    )

    return await gremlinApi.submitAndParse(gremlinInvoke).then( (resultData: any) => {
        if (resultData.length > 1) throw '查詢文件有多筆結果，程式或資料有問題'
        if (! resultData.length) return undefined

        const resultDocumentOrMap = resultData[0]
        let document = undefined
        if (resultDocumentOrMap instanceof Entity) {
            document = new Document(resultDocumentOrMap)
        } else if ((resultDocumentOrMap instanceof Map)) {
            const sentencesJson = resultDocumentOrMap.values().next().value
            const documentTranslatedSentences: TranslatedSentence[] = []
            sentencesJson.forEach( (segmentMap: any, sentenceNode: any) => {
                const sentenceTranslatedSegments: TranslatedSegment[] = []
                segmentMap.forEach( (emptyMap: any, segmentNode:any ) => {
                    const segment = new TranslatedSegment(segmentNode)
                    sentenceTranslatedSegments.push(segment)
                })
                const sentence = new TranslatedSentence(sentenceNode)
                sentence.translatedSegments = sentenceTranslatedSegments
                documentTranslatedSentences.push(sentence)
            })
            const documentEntity: Entity = resultDocumentOrMap.keys().next().value
            document = new Document(documentEntity)
            document.translatedSentences = documentTranslatedSentences
        } else {
            throw '查詢結果不是 Map 或 Entity，程式或資料有問題'
        }

        return document
    }).catch( (error) => {
        console.error(error)
        throw error
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
    let existingSegment = undefined
    if (existingSentence) {
        // 更新 sentence
        gremlinInvoke.V(existingSentence.id)
        .as(sentenceVertexAlias)

        existingSegment = existingSentence.translatedSegment(targetPattern.token.indexInSentence)
    } else {
        // 新建 TranslatedSentence
        if (!document || !document.id) {
            throw '必須有 Document，而且 Document 必須有 Id'
        }
        // TODO 更新 document 的 sentence 和 segement

        gremlinInvoke
        // setence
        .addV(gremlinApi.translatedVertexLabels.translatedSentence) // sentence
        .as(sentenceVertexAlias)
        .property(TranslatedSentence.propertyNames.index, sentenceIndex)
        .addE(gremlinApi.translatedEdgeLabels.isPartOf)
        .to(new gremlinApi.GremlinInvoke(true).V(document.id)) // sentence -> document
    }
    
    if (existingSegment) {
        gremlinInvoke.V(existingSegment.id)
        // .property(TranslatedSegment.propertyNames.rootTokenIndex, targetPattern.token.indexInSentence)
        // PROGRESS 要先刪 TranslatedPiece 再建？
    }
        
    // TODO 還要考慮 segment 更新的狀況，避免 segment index 重覆
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
    // TODO 還要存 text pieces 和 token pieces
    // TODO 處理 piece
    // TODO targetPattern.selection.selected.pieces
    gremlinApi.submitAndParse(gremlinInvoke.command()).then((objects) => {
        console.log('sentence saved', objects)
        // 回傳的是新建的 vertex
    })
}

class TranslatedSegment {
    $rootTokenIndex: number
    $id: bigint

    constructor(entity: Entity) {
        this.$rootTokenIndex = 
        entity.propertyJson[TranslatedSegment.propertyNames.rootTokenIndex][0][gremlinApi.keys.value][gremlinApi.keys.propertyValue][gremlinApi.keys.value]
        this.$id = 
        entity.propertyJson[TranslatedSegment.propertyNames.rootTokenIndex][0][gremlinApi.keys.value][gremlinApi.keys.propertyValue][gremlinApi.keys.value]
    }

    get rootTokenIndex() {
        return this.$rootTokenIndex
    }
    get id() {
        return this.$id
    }

    static propertyNames = Object.freeze({
        rootTokenIndex: 'rootTokenIndex'
        , id: 'id'
    })
    static className = 'TranslatedSegment'
}
export class TranslatedSentence {
    $index: number
    $id: number
    $translatedSegments: TranslatedSegment[] = []

    constructor(entity: Entity) {
        this.$id = entity.id
        this.$index = 
        entity.propertyJson[TranslatedSentence.propertyNames.index][0][gremlinApi.keys.value][gremlinApi.keys.propertyValue][gremlinApi.keys.value]
    }

    translatedSegment(index: number): TranslatedSegment {
        // 測試發現如果沒有資料，會回傳空陣列
        const matchingSentenceArray = this.$translatedSegments.filter(segment => {return segment.rootTokenIndex == index})
        return (undefined || matchingSentenceArray[0])
    }

    get index() {
        return this.$index
    }
    get id() {
        return this.$id
    }

    get translatedSegments() {
        return this.$translatedSegments
    }
    set translatedSegments(translatedSegments) {
        this.$translatedSegments = translatedSegments
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
    $translatedSentences: TranslatedSentence[] = []

    constructor(documentEntity?: Entity) {
        if (! documentEntity) return
        const parseJsonString = documentEntity.propertyJson[gremlinApi.propertyNames.parse][0][gremlinApi.keys.value][gremlinApi.keys.propertyValue]
        const parse = JSON.parse(parseJsonString)
        this.parse = parse
        this._id = documentEntity.id
        
        const content = documentEntity.propertyJson[gremlinApi.propertyNames.content][0][gremlinApi.keys.value][gremlinApi.keys.propertyValue]
        this.content = content || this.content
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