const apigClientFactory = require('aws-api-gateway-client').default;

import * as documentPersistence from '@/composables/document/document-persistence'
import { ModifiedSpacyDependency, ModifiedSpacyToken } from '@/composables/sentenceManager';

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

const pathParams = {}
const pathTemplate = ''
const method = 'POST'
const additionalParams = {}
export enum MinimalClassName {
    DocumentActionRequest = '.DocumentActionRequest'
    , PatternActionRequest = '.PatternActionRequest'
    , SourcePatternToken = '.SourcePatternToken'
    , SourcePatternDependency = '.SourcePatternDependency'
}
export async function queryExistingDocument(documentId: number|undefined, documentText: string|undefined) {
    console.log('function, apigclientFactory', apigClientFactory)
    const document = {
        id: documentId
        , content: documentText
    }
    const body = {
        type: MinimalClassName.DocumentActionRequest
        , document: document
        , action: DocumentAction.QUERY
    }
    console.log('BODY BEFORE QUERY_DOCUMENT', body)
    const documentQueryResult = await apigClient.invokeApi(pathParams, pathTemplate, method, additionalParams, body)
        .then(function(response: any){
            return response.data
        }).catch( function(result: string){
            console.log('api exception query existing document', result)
            throw new Error(result)
        })

    return documentQueryResult
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
    const documentQueryResult = await apigClient.invokeApi(pathParams, pathTemplate, method, additionalParams, body)
        .then(function(response: any){
            const newlySavedDocument = response.data
            document.gremlinId = newlySavedDocument.id
            return document
        }).catch( function(result: string){
            console.log('api exception save new document', result)
            throw new Error(result)
        })
    return document
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
    const savedResult = await apigClient.invokeApi(pathParams, pathTemplate, method, additionalParams, body)
        .then(function(response: any){
            const savedResult = response.data
            return savedResult
        }).catch( function(result: string){
            console.log('api exception save new document', result)
            throw new Error(result)
        })
    return savedResult
}

export function generateDependencyForAWS(arc: ModifiedSpacyDependency) {
    const sourcePatternDependency: any = {};
    sourcePatternDependency['type'] = MinimalClassName.SourcePatternDependency;
    sourcePatternDependency['label'] = arc.label;
    sourcePatternDependency['isPlaceholder'] = arc.isPlaceholder;
    sourcePatternDependency['trueStart'] = arc.trueStart;
    sourcePatternDependency['trueEnd'] = arc.trueEnd;
    sourcePatternDependency['sourcePatternEdgeId'] = arc.sourcePatternEdgeId;
    if (arc.selectedEndToken) {
        sourcePatternDependency['selectedEndToken'] = {
            type: MinimalClassName.SourcePatternToken,
            indexInSentence: arc.selectedEndToken.indexInSentence
        };
    }
    return sourcePatternDependency;
}
export function generateTokenForAWS(token: ModifiedSpacyToken) {
    const sourcePatternToken: any = {};
    sourcePatternToken['type'] = MinimalClassName.SourcePatternToken;
    sourcePatternToken['indexInSentence'] = token.indexInSentence;
    sourcePatternToken['sourcePatternVertexId'] = token.sourcePatternVertexId
    // sourcePatternToken['selectedMorphologyInfoTypes'] = token.selectedMorphologyInfoTypes;
    // sourcePatternToken['selectedMorphologyInfoValues'] = token.selectedMorphologyInfoValues;
    return sourcePatternToken;
}