const apigClientFactory = require('aws-api-gateway-client').default;

import * as documentPersistence from '@/composables/document/document-persistence'

const config = {
    invokeUrl: process.env.VUE_APP_AWS_API_INVOKE_URL
    , region: process.env.VUE_APP_AWS_REGION
    , accessKey: process.env.VUE_APP_AWS_ACCESSKEY
    , secretKey: process.env.VUE_APP_AWS_SECRETKEY
}
const apigClient = apigClientFactory.newClient(config)
console.log('apigclient', apigClient)

enum DocumentAction {
    QUERY = 'QUERY'
    , SAVE_NEW = 'SAVE_NEW'
}

const pathParams = {}
const pathTemplate = ''
const method = 'POST'
const additionalParams = {}
export async function queryExistingDocument(documentId: number|undefined, documentText: string|undefined) {
    console.log('function, apigclientFactory', apigClientFactory)
    const document = {
        id: documentId
        , content: documentText
    }
    const body = {
        document: document
        , action: DocumentAction.QUERY
    }
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
        document: parseStringifiedDocument
        , action: DocumentAction.SAVE_NEW
    }
    const documentQueryResult = await apigClient.invokeApi(pathParams, pathTemplate, method, additionalParams, body)
        .then(function(response: any){
            console.log('NEW SAVED DOCUMENT JSON', response)
            return document
        }).catch( function(result: string){
            console.log('api exception save new document', result)
            throw new Error(result)
        })
    return document
}