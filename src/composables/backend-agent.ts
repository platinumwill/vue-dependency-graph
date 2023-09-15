const apigClientFactory = require('aws-api-gateway-client').default;

import * as documentPersistence from '@/composables/document/document-persistence'
import { ModifiedSpacyDependency, ModifiedSpacyToken } from '@/composables/sentenceManager';
import { propertyNames } from '@/composables/gremlinManager';

const config = {
    invokeUrl: process.env.VUE_APP_AWS_API_INVOKE_URL
    , region: process.env.VUE_APP_AWS_REGION
    , accessKey: process.env.VUE_APP_AWS_ACCESSKEY
    , secretKey: process.env.VUE_APP_AWS_SECRETKEY
}
const apigClient = apigClientFactory.newClient(config)
console.log('apigclient', apigClient)

enum DocumentAction {
    QUERY = 'query'
    , SAVE_NEW = 'save_new'
}
enum PatternAction {
    SAVE_NEW = 'save_new'
}
enum TargetPatternAction {
    query_by_sourcePatternBeginningId = 'query_by_sourcePatternBeginningId'
}

enum SourcePatternAction {
    SAVE_NEW = 'save_new'
    , query_by_begin_token = 'query_by_begin_token'
    , query_by_id = 'query_by_id'
}

const pathParams = {}
const pathTemplate = ''
const method = 'POST'
const additionalParams = {}
export enum MinimalClassName {
    DocumentActionRequest = '.DocumentActionRequest'
    , PatternActionRequest = '.PatternActionRequest'
    , SourcePatternPiece = '.SourcePatternPiece'
    , SourcePatternDependency = '.SourcePatternDependency'
}
export async function queryExistingDocument(documentParam?: {id?: string, content?: string}) {
        console.log('DOCUMENT-PARAM', documentParam)

        if (!documentParam) {
            return undefined
        }

        const document = {
            content: documentParam.content
        }
        const body = {
            type: MinimalClassName.DocumentActionRequest
            , document: document
            , action: DocumentAction.QUERY
        }
        return await apigClient.invokeApi(pathParams, pathTemplate, method, additionalParams, body)
            .then(function(response: any){

                console.log('BACKAGENT QUERY DOCUMENT RESPONSE BODY', response.data)

                if (! response.data.length) {
                    return documentParam
                }

                const documentInDb = new documentPersistence.Document()
                documentInDb.gId = response.data[0]['id']
                documentInDb.content = response.data[0]['content']
                documentInDb.parse = JSON.parse(response.data[0]['parse'])
                if (documentParam) {
                    documentInDb.id = documentParam.id
                }
                
                return documentInDb 
            }).catch( function(result: string){
                console.log('api exception query existing document', result)
                throw new Error(result)
            })
}

export async function saveNewDocument(document: documentPersistence.Document) {
    const parseStringifiedDocument = {
        parse: JSON.stringify(document.parse)
        , content: document.content
    }
    const body = {
        type: MinimalClassName.DocumentActionRequest
        , document: parseStringifiedDocument
        , action: DocumentAction.SAVE_NEW
    }
    console.log('BODY BEFORE SAVE-NEW-DOCUMENT', body)
    return new Promise((resolve, reject) => {
        apigClient.invokeApi(pathParams, pathTemplate, method, additionalParams, body)
            .then(function(response: any){
                const newlySavedDocument = response.data
                console.log('AWS SAVED DOCUMENT', newlySavedDocument)
                document.gId = newlySavedDocument.id
                resolve(document)
            }).catch( function(result: string){
                console.log('api exception save new document', result)
                throw new Error(result)
            })
    })
}

let sourcePatternTokens: any[]
let sourcePatternDependencies: any[]
export async function setSourcePattern(sourcePattern: any[], sourcePatternDependencyArray: any[]) {
    sourcePatternTokens = sourcePattern
    sourcePatternDependencies = sourcePatternDependencyArray
}
let linearTargetPatternPieces: any[]
export async function setTargetPattern(linearTargetPatternPieceArray: any[]) {
    linearTargetPatternPieces = linearTargetPatternPieceArray
}
export async function triggerPatternSaving() {
    console.log('SOURCE PATTERN', sourcePatternTokens)
    console.log('SOURCE PATTERN DEPENDENCY ARRAY', sourcePatternDependencies)
    const body = {
        type: MinimalClassName.PatternActionRequest
        , sourcePatternAction: {
            sourcePatternTokens: sourcePatternTokens
            , sourcePatternDependencies: sourcePatternDependencies
            , action: PatternAction.SAVE_NEW
        }
        , targetPatternAction: {
            linearTargetPatternPieces: linearTargetPatternPieces
            , action: PatternAction.SAVE_NEW
        }
    }
    console.log('BODY BEFORE SAVE-PATTERN', body)
    return await apigClient.invokeApi(pathParams, pathTemplate, method, additionalParams, body)
        .then(function(response: any){
            return response.data
        }).catch( function(result: string){
            console.log('api exception save new document', result)
            throw new Error(result)
        })
}

export function querySourcePattern(beginWord: any, deps?: any[], depSums?: Map<String, number>) {
    const awsSourcePattern:any[] = []
    awsSourcePattern.push(beginWord)

    const body = {
        type: MinimalClassName.PatternActionRequest
        , sourcePatternAction: {
            sourcePatternTokens: awsSourcePattern
            , sourcePatternDependencies: deps
            , action: SourcePatternAction.query_by_begin_token
        }
    }
    console.log('BODY BEFORE QUERY-SOURCE-PATTERN', body)

    return new Promise( (resolve) => {
        apigClient.invokeApi(pathParams, pathTemplate, method, additionalParams, body)
            .then(function(response: any){
                resolve(response.data)
            }).catch( function(result: string){
                console.log('api exception save new document', result)
                throw new Error(result)
            })
    })
    return apigClient.invokeApi(pathParams, pathTemplate, method, additionalParams, body)
        .then(function(response: any){
            const savedResult = response.data
            return savedResult
        }).catch( function(result: string){
            console.log('api exception save new document', result)
            throw new Error(result)
        })
}

export async function querySourcePatternById(sourcePatternBeginningId: string) {
    const body = {
        type: MinimalClassName.PatternActionRequest
        , sourcePatternAction: {
            sourcePatternBeginningId: sourcePatternBeginningId
            , action: SourcePatternAction.query_by_id
        }
    }
    console.log('BODY BEFORE QUERY-SOURCE-PATTERN-BY-ID', body)

    return apigClient.invokeApi(pathParams, pathTemplate, method, additionalParams, body)
        .then(function(response: any){
            return response.data
        }).catch( function(result: string){
            console.log('api exception save new document', result)
            throw new Error(result)
        })
}

export async function queryTargetPattern(sourcePatternBeginningId: string) {
    const body = {
        type: MinimalClassName.PatternActionRequest
        , targetPatternAction: {
            sourcePatternBeginningId: sourcePatternBeginningId
            , action: TargetPatternAction.query_by_sourcePatternBeginningId
        }
    }

    return await apigClient.invokeApi(pathParams, pathTemplate, method, additionalParams, body)
        .then(function(response: any){
            return response.data
        }).catch( function(result: string){
            console.log('api exception querying target pattern', result)
            throw new Error(result)
        })
}

export function generateDependencyForAWS(arc: ModifiedSpacyDependency, seqNo: number) {
    const sourcePatternDependency: any = {};
    sourcePatternDependency['type'] = MinimalClassName.SourcePatternDependency;
    sourcePatternDependency['label'] = arc.label;
    sourcePatternDependency['seqNo'] = seqNo
    sourcePatternDependency['isPlaceholder'] = arc.isPlaceholder;
    sourcePatternDependency['trueStart'] = arc.trueStart;
    sourcePatternDependency['trueEnd'] = arc.trueEnd;
    sourcePatternDependency['sourcePatternEdgeId'] = arc.sourcePatternEdgeId;
    if (arc.selectedEndToken) {
        sourcePatternDependency['selectedEndToken'] = generateTokenForAWS(arc.selectedEndToken)
    }
    return sourcePatternDependency;
}
export function generateTokenForAWS(word: ModifiedSpacyToken, index?: number) {

    console.log("SELECTED MORPHOLOGY INFO TYPES", word.selectedMorphologyInfoTypes)

    const sourcePatternPiece: any = {};
    sourcePatternPiece['type'] = MinimalClassName.SourcePatternPiece
    sourcePatternPiece['indexInSentence'] = word.indexInSentence
    sourcePatternPiece['sourcePatternVertexId'] = word.sourcePatternVertexId
    sourcePatternPiece.isBeginning = word.isBeginning;

    if (index != undefined) {
        sourcePatternPiece[propertyNames.seqNo] = index + 1;
    }

    const morphInfoMap = new Map();
    word.selectedMorphologyInfoTypes.forEach((morphInfoType) => {
        morphInfoMap.set(morphInfoType.name, word[morphInfoType.propertyInWord]);
    });
    sourcePatternPiece['morphInfoMap'] = Object.fromEntries(morphInfoMap);
    return sourcePatternPiece;
}