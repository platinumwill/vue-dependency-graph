import spacy from '@/composables/parse-providers/spacyAgent'
import stanford from '@/composables/parse-providers/stanfordnlpAgent'
import google from '@/composables/parse-providers/googleAgent'

export default function() {
    return {
        spacyFormatParseProviders: [
            google
            , stanford
            , spacy
        ]
    }
}

export type SpacyParseProvider = {
    parse: Function
}
