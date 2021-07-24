import spacy from '@/composables/parse-providers/spacyAgent.js'
import stanford from '@/composables/parse-providers/stanfordnlpAgent.js'
import google from '@/composables/parse-providers/googleAgent.js'

export default function() {
    return {
        spacyFormatParseProviders: [
            google
            , stanford
            , spacy
        ]
    }
}
