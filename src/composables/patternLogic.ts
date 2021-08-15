import * as gremlinApi from "@/composables/gremlinManager"
import { SourcePatternManager } from "@/composables/sourcePatternManager"

// TODO 變數名稱待調整
export default function patternManager (sourcePatternManager: SourcePatternManager, targetPattern: any) {
    const saveSelectedPattern = () => {
        let gremlinInvoke = new gremlinApi.GremlinInvoke()

        // TODO 判斷現在的 pattern 是不是既有的，是的話就不要再存
        gremlinInvoke = sourcePatternManager.process.save(gremlinInvoke)
        gremlinInvoke = targetPattern.process.save(gremlinInvoke)
        gremlinInvoke.call("select", gremlinApi.aliases.sourcePatternBeginning)

        console.log(gremlinInvoke.command())
        gremlinApi.submit(gremlinInvoke.command())
        .then((resultData: any) => {
            const sourcePatternBeginningVertexId = resultData['@value'][0]['@value'].id['@value']
            console.log('Source Pattern Begin Vertex Id: ', sourcePatternBeginningVertexId)
            sourcePatternManager.selection.reloadOptions().then(() => {
                sourcePatternManager.selection.setAsSelected(sourcePatternBeginningVertexId)
            })
            return sourcePatternBeginningVertexId
        }).catch(function(error) {
            console.error(error)
        })
    }

    return {
        patternManager: {
            saveSelectedPattern: saveSelectedPattern
        }
    }

}