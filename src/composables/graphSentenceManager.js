import { useStore } from "vuex"
import * as gremlinManager from "@/composables/gremlinManager"
import * as sourcePatternUtil from "@/composables/sourcePatternManager"

export default function(sourcePatternManager, targetPattern, spacyFormatSentences) {

    const store = useStore()

    const toggleDependencySelection = (dependency) => {
        store.dispatch('setToggling', true)

        if (dependency.selected || dependency.sourcePatternEdgeId) {
            dependency.sourcePatternEdgeId = undefined
            dependency.selected = undefined
            selectedSourcePattern.value = undefined
        } else {
            dependency.selected = !dependency.selected
        }
        sourcePatternManager.selection.reloadOptions().then( () => {
            findExistingMatchSourcePatternAndMark()
        })
    }
    const findExistingMatchSourcePatternAndMark = () => {
        if (!findBeginWord()) return
        const selectedArcsFromBegin = currentSentence().arcs.filter( (arc) => {
            return (arc.selected && arc.trueStart === findBeginWord().indexInSentence)
        })
        if (selectedArcsFromBegin.length === 0) return
        let gremlinInvoke = new gremlinManager.GremlinInvoke()
        .call("V")
        const beginWord = findBeginWord()
        beginWord.selectedMorphologyInfoTypes.forEach( (morphInfoType) => {
            gremlinInvoke = gremlinInvoke.call("has", morphInfoType.name, beginWord[morphInfoType.propertyInWord])
        })
        gremlinInvoke.call(
            "where"
            , new gremlinManager.GremlinInvoke(true)
            .call("outE")
            .call("count")
            .call("is", selectedArcsFromBegin.length)
        )
        const arcSum = new Map();
        selectedArcsFromBegin.forEach( (selectedArc) => {
            if ( arcSum.has(selectedArc.label) ) {
                arcSum.set(selectedArc.label, arcSum.get(selectedArc.label) + 1)
            } else {
                arcSum.set(selectedArc.label, 1)
            }
        })
        arcSum.forEach( (value, key) => {
            gremlinInvoke.call(
                "and"
                , new gremlinManager.GremlinInvoke(true)
                .call("outE", key)
                .call("count")
                .call("is", value)
            )
        })
        // TODO 到這裡只完成第一層的 edge 判斷，還有後續的 vertex 和 edge 要查
        const gremlinCommand = gremlinInvoke.command()
        console.log(gremlinCommand)
        gremlinManager.submit(gremlinCommand).then( (resultData) => {
            if (resultData['@value'].length === 0) {
                sourcePatternUtil.clearSelection(selectedSourcePattern)
                sourcePatternUtil.clearOptions(sourcePatternOptions)
                return
            }
            if (resultData['@value'].length > 1) {
                const error = "資料庫存的 pattern 重覆"
                console.error(error, resultData)
                throw error
            }
            const sourcePatternBeginningId = resultData['@value'][0]['@value'].id['@value']
            sourcePatternManager.selection.setAsSelected(sourcePatternBeginningId)
        })
    }

    const selectedSourcePattern = sourcePatternManager.selection.selectedPattern
    const sourcePatternOptions = sourcePatternManager.selection.options

    const currentSentence = () => {
        return spacyFormatSentences[store.getters.currentSentenceIndex]
    }
    const findBeginWord = () => {
        const beginWords = currentSentence().words.filter( (word) => {
            return word.isBeginning
        })
        if (beginWords.length <= 0) return undefined
        if (beginWords.length > 1) {
            const error = "begin word 超過一個，程式控制有問題"
            console.error(error)
            throw error
        }
        return beginWords[0]
    }

    return {
        toggleDependencySelection
        , sourcePattern: {
            selected: selectedSourcePattern
            , options: sourcePatternOptions.value
        }
    }
}
