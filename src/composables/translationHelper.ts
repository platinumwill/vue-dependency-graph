import { SourcePatternManager } from "@/composables/sourcePatternManager";
import { TargetPattern } from "@/composables/targetPatter";
import { aliases, GremlinInvoke, submit } from "@/composables/gremlinManager";

export type TranslationHelper = {
    saveSelectedPattern: Function
}

export function prepareTranslationHelper (
    sourcePattern: SourcePatternManager
    , targetPattern: TargetPattern
) {

    return {
        saveSelectedPattern: saveSelectedPattern
    }
}

const saveSelectedPattern = (
    sourcePattern: SourcePatternManager
    , targetPattern: TargetPattern
) => {
    let gremlinInvoke = new GremlinInvoke()

    gremlinInvoke = sourcePattern.process.save(gremlinInvoke)
    gremlinInvoke = targetPattern.process.save(gremlinInvoke)
    gremlinInvoke.call("select", aliases.sourcePatternBeginning)

    console.log(gremlinInvoke.command())
    submit(gremlinInvoke.command())
    .then((resultData: any) => {
        const sourcePatternBeginningVertexId = resultData['@value'][0]['@value'].id['@value']
        console.log('Source Pattern Begin Vertex Id: ', sourcePatternBeginningVertexId)
        sourcePattern.selection.reloadOptions().then(() => {
            sourcePattern.selection.setAsSelected(sourcePatternBeginningVertexId)
        })
        return sourcePatternBeginningVertexId
    }).catch(function(error) {
        console.error(error)
    })
}
