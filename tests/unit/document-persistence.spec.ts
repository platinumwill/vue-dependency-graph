import * as backendAgent from "@/composables/backend-agent"
import * as gremlinApi from '@/composables/gremlinManager'
import * as documentPersistence from '@/composables/document/document-persistence'

jest.mock('@/composables/backend-agent')
jest.mock('@/composables/gremlinManager', () => {
    const gremlinApi = jest.requireActual('@/composables/gremlinManager');

    return {
        __esModule: true,
        ...gremlinApi,
        // submitAndParse: jest.fn(() => new Promise((resolve, reject) => {}))
    }
})
describe('document persistence test', () => {
    it('integration test', () => {
        (backendAgent.queryExistingDocument as jest.Mock).mockResolvedValue([]);
        const content = "Samuel L. Jackson sent an email to Stanford University. He didn't get a reply."
        documentPersistence.retrieveDocument(content,'some provider', undefined)
    })
})
