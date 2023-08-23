import * as gremlinApi from '@/composables/gremlinManager'
import { Entity } from '@/composables/gremlinManager'
import { LinearTargetPatternPiece, TargetPattern } from '@/composables/targetPattern'
import * as backendAgent from "@/composables/backend-agent"

export async function retrieveDocument(documentText: string, spacyFormatParseProviderName: string, spacyFormatParseProvider: any) {
    if (spacyFormatParseProviderName != undefined) { // 有名字，就可以視同解析解果會被儲存

        // return await backendAgent.queryExistingDocument(documentId, documentText).then( (resultData: Object[]) => {
        await backendAgent.queryExistingDocument(undefined, documentText).then( (resultData) => {
            console.log('document from REMOTE', resultData)
            // console.log('document from NEPTUNE length', resultData.length)
            // if (resultData.length == 1) {
            //     console.log('AWS DOCUMENT', resultData[0])
            // }
            // if (resultData.length > 1) throw '查詢文件有多筆結果，程式或資料有問題'
            // if (! resultData.length) return undefined
        })

        let document: Document|undefined = undefined
        await queryExistingDocument(undefined, documentText).then( (queryResult) => { // 轉換到 aws 的初期，全文檢索暫時不實做
            document = queryResult
            return document
        } ).catch( (error) => {
            console.error(error)
            throw error
        })
        // convert to aws 轉換到 aws 以後，這一段就不用了，因為用 aws 可以直接新增
        if (document != undefined) {
            console.log('existing document retrieved: ', document)
            return document
        } else {
            // 3 種 spacyFormatParseProvider.parse 最後都會回傳有 content 和 parse 屬性的 (document) 物件
            // TODO convert to aws 要作廢
            return spacyFormatParseProvider.parse(documentText)
                .then(saveDocumentParse) // janusgraph impl
                .then(backendAgent.saveNewDocument) // aws impl
                .then( (newlySavedDocument: Document) => {
                    return newlySavedDocument
                })
        }
    }
    return spacyFormatParseProvider.parse(documentText)
}

// TODO convert to aws 要作廢
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

    console.log('SAVED JANUSGRAPH document', document)
    return document
}

// TODO convert to aws
async function queryExistingDocument(documentId: number|undefined, documentText: string|undefined) {

    const gremlinInvoke = new gremlinApi.GremlinInvoke()

    if (documentId) {
        // search by document id
        gremlinInvoke.V(documentId)
    // 轉換到 aws 的初期，全文檢索暫時不實做
    } else if (documentText) {
        // search by document text
        gremlinInvoke
        .V()
        .has(gremlinApi.propertyNames.content, new gremlinApi.GremlinInvoke(true).call('textFuzzy', documentText))
    } else {
        const error = '沒有參數，程式錯誤'
        console.error(error)
        throw error
    }

    // TODO convert to aws
    // 查詢 document 的內容
    gremlinInvoke.until(
        new gremlinApi.GremlinInvoke(true)
        .and(
            new gremlinApi.GremlinInvoke(true)
            .__not(new gremlinApi.GremlinInvoke(true).__in(gremlinApi.translatedEdgeLabels.isPartOf))
            , new gremlinApi.GremlinInvoke(true)
            .__not(new gremlinApi.GremlinInvoke(true).out(gremlinApi.translatedEdgeLabels.translateWith))
        )
    )
    .repeat(
        new gremlinApi.GremlinInvoke(true).__in()
    ).tree()

    ////////////////////////////////////////////
    return await gremlinApi.submitAndParse(gremlinInvoke).then( (resultData: any) => {
        if (resultData.length > 1) throw '查詢文件有多筆結果，程式或資料有問題'
        if (! resultData.length) return undefined

        const resultDocumentOrMap = resultData[0]
        let document = undefined
        if ((resultDocumentOrMap instanceof Map)) {
            if (! resultDocumentOrMap.size) return undefined // 裡面可能沒東西

            // TODO convert to aws
            const sentencesJson = resultDocumentOrMap.values().next().value
            const documentTranslatedSentences: TranslatedSentence[] = []
            const documentEntity: Entity = resultDocumentOrMap.keys().next().value
            document = new Document(documentEntity)
            if (sentencesJson) {
                sentencesJson.forEach( (segmentMap: any, sentenceNode: any) => { // loop sentences
                    const sentenceTranslatedSegments: TranslatedSegment[] = []
                    segmentMap.forEach( (emptyMap: any, segmentNode:any ) => { // loop segments
                        const segment = new TranslatedSegment(segmentNode) // load segment
                        sentenceTranslatedSegments.push(segment)
                    })
                    const sentence = new TranslatedSentence(sentenceNode) // load sentence
                    sentence.translatedSegments = sentenceTranslatedSegments
                    documentTranslatedSentences.push(sentence)
                })
                document.translatedSentences = documentTranslatedSentences
            }
        } else {
            throw '查詢結果不是 Map 或 Entity，程式或資料有問題'
        }

        return document
    }).catch( (error) => {
        console.error(error)
        throw error
    })
}

// translationHelper.toggleSegmentTranslationConfirmed 會來呼叫
export function saveInitialSegmentTranslation (
    targetPattern: TargetPattern
    , document: Document
    ) {

    if (targetPattern.token.sentence?.index == undefined) throw '資料有問題'
    const sentenceIndex: number = targetPattern.token.sentence?.index
    const existingSentence = document.translatedSentence(sentenceIndex)
    let existingSegment = undefined
    if (existingSentence) {
        // 更新 sentence
        const gremlinInvoke = new gremlinApi.GremlinInvoke()
        gremlinInvoke.V(existingSentence.id)

        existingSegment = existingSentence.translatedSegment(targetPattern.token.indexInSentence)
    }
    addInitialSegmentTranslation(targetPattern, document, existingSegment)
}

// 儲存 segment 初步翻譯
function addInitialSegmentTranslation (
    targetPattern: TargetPattern
    , document: Document
    , existingSegment: TranslatedSegment | undefined
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
        gremlinInvoke.V(existingSentence.id)
        .as(sentenceVertexAlias)

        existingSegment = existingSentence.translatedSegment(targetPattern.token.indexInSentence)
    } else {
        // 新建 TranslatedSentence
        if (!document || !document.id) {
            throw '必須有 Document，而且 Document 必須有 Id'
        }

        gremlinInvoke
        // setence
        .addV(gremlinApi.translatedVertexLabels.translatedSentence) // sentence
        .property(TranslatedSentence.propertyNames.index, sentenceIndex)
        .as(sentenceVertexAlias)
        .addE(gremlinApi.translatedEdgeLabels.isPartOf)
        .to(new gremlinApi.GremlinInvoke(true).V(document.id)) // sentence -> document
    }
    
    // segment
    const segmentAlias = 'segmentAlias'
    const oldPiecesAlias = 'oldPiecesAlias'
    if (existingSegment) {
        gremlinInvoke
        .V(existingSegment.id)
        .as(segmentAlias)
        .choose(
            new gremlinApi.GremlinInvoke(true).inE().hasLabel(gremlinApi.translatedEdgeLabels.isPartOf)
            , new gremlinApi.GremlinInvoke(true).inE().hasLabel(gremlinApi.translatedEdgeLabels.isPartOf).outV().as(oldPiecesAlias) // 舊的 pieces 先選起來，最後才能刪
        )
    // PROGRESS 要先刪 TranslatedPiece 再建？
        .select(segmentAlias)
        .dedup()
    } else {
        gremlinInvoke
        .addV(gremlinApi.translatedVertexLabels.translatedSegment) // segement
        .as(segmentAlias)
        .property(TranslatedSegment.propertyNames.rootTokenIndex, targetPattern.token.indexInSentence)
        .addE(gremlinApi.translatedEdgeLabels.isPartOf)
        .to(sentenceVertexAlias) // segment -> sentence
        .outV() // segment
        .addE(gremlinApi.translatedEdgeLabels.translateWith)
        .to(new gremlinApi.GremlinInvoke(true).V(selectedTargetPatternId)) // segment -> target pattern
        .outV()
    }
    // 存 text pieces 和 token pieces
    targetPattern.dialogPieces.pieces.forEach( (piece: LinearTargetPatternPiece) => {
        if (piece.type.name == LinearTargetPatternPiece.types.dependency.name) return // type 是 text 或 token 才要處理

        let text = ''
        if (piece.appliedText) {
            text = piece.appliedText
        }
        let tokenLabel = undefined
        let property = undefined

        if (piece.type.name == LinearTargetPatternPiece.types.token.name) {
            tokenLabel = gremlinApi.translatedVertexLabels.translatedToken
            property = TranslatedToken.propertyNames.translatedText
        } else if (piece.type.name == LinearTargetPatternPiece.types.text.name) {
            tokenLabel = gremlinApi.translatedVertexLabels.translatedText
            property = TranslatedText.propertyNames.text
        } else {
            const error = '例外流程，程式控制有錯'
            console.log(error)
            throw error
        }
        gremlinInvoke
        .addV(tokenLabel)
        .property(property, text)
        .addE(gremlinApi.translatedEdgeLabels.isPartOf)
        .to(segmentAlias)
        // .outV() // 回到 segment
    })
    gremlinInvoke.select(oldPiecesAlias).dedup().drop()

    // TODO targetPattern.selection.selected.pieces
    gremlinApi.submitAndParse(gremlinInvoke.command()).then((objects) => {
        console.log('sentence saved', objects)
        // 回傳的是新建的 vertex
    })

    // TODO 更新 document 的 sentence 和 segement
    // 更新 Document
    // 不知道這裡會不會有 async 的問題
    queryExistingDocument(document.id, undefined).then( (reloadedDocument) => {
        Object.assign(document, reloadedDocument)
        console.log('reloaded document', document)
    } )
}

class TranslatedText {
    $text: string = ''

    get text() {
        return this.$text
    }
    set text(text: string) {
        this.$text = text
    }

    static propertyNames = Object.freeze({
        text: 'text'
    })
}
class TranslatedToken {
    $translatedText: string = ''

    get translatedText() {
        return this.$translatedText
    }
    set translatedText(translatedText: string) {
        this.$translatedText = translatedText
    }

    static propertyNames = Object.freeze({
        translatedText: 'translatedText'
    })
}
class TranslatedSegment {
    $rootTokenIndex: number
    $id: number

    constructor(entity: Entity) {
        this.$rootTokenIndex = 
        entity.propertyJson[TranslatedSegment.propertyNames.rootTokenIndex][0][gremlinApi.keys.value][gremlinApi.keys.propertyValue][gremlinApi.keys.value]
        this.$id = entity.id
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
    gId: string = ''
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
        if (matchingSentenceArray.length > 1) {
            const error = '相同 index 的 sentence 有重覆，資料有問題'
            console.log(error)
            throw error
        }
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
        // TODO 檢查重覆
        this.$translatedSentences = translatedSentences
    }

}