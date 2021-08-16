import { ComputedRef, watch } from "vue"
import { useStore } from "vuex"

import * as gremlinApi from "@/composables/gremlinManager"
import { SourcePatternManager } from "@/composables/sourcePatternManager"
import { ModifiedSpacySentence } from "./sentenceManager"
import { LinearTargetPattern } from "./targetPatternPieceManager"
import { morphologyInfoTypeEnum } from "./morphologyInfo"

// TODO 變數名稱待調整
export default function patternManager (
    sourcePatternManager: SourcePatternManager
    , targetPattern: any
    , currentSentence: ComputedRef<ModifiedSpacySentence>
    ) {
    const saveSelectedPattern = () => {
        let gremlinInvoke = new gremlinApi.GremlinInvoke()

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

    const store = useStore()
    watch(sourcePatternManager.selection.selectedPattern, (newValue, oldValue) => {
        console.log('watching selected source pattern change: ', newValue, oldValue)
        const sentence = currentSentence.value
        if (! store.getters.toggling) {
            sentence.clearSelection()
        }
        // TODO 這裡有點亂，待整理
        sentence.arcs.forEach( arc => arc.sourcePatternEdgeId = undefined)
        targetPattern.selection.clearOptions()
        if (newValue == undefined || newValue.id == undefined) {
            sentence.words.forEach( (word) => {
                word.sourcePatternVertexId = undefined
            })
            return
        }

        const currentBeginWord = currentSentence.value.findBeginWord()
        if (currentBeginWord == undefined) return
        
        const sourcePatternBeginningId = newValue.id
        currentBeginWord.sourcePatternVertexId = sourcePatternBeginningId
        autoMarkMatchingSourcePattern(sourcePatternBeginningId).then( () => {
            // 處理 target pattern
            targetPattern.selection.clearSelection()
            targetPattern.selection.reloadOptions(sourcePatternBeginningId).then( (targetPatternOptions: LinearTargetPattern[]) => {
                console.log('target pattern options reloaded: ', targetPatternOptions)
            })
        })
        store.dispatch('setToggling', false)
    })

    const autoMarkMatchingSourcePattern = (sourcePatternBeginningId: number) => {
        sourcePatternManager.selection.setAsSelected(sourcePatternBeginningId)
        // 這裡必須要用 ==，因為 Primevue 的值是存 null，不是存 undefined
        if (sourcePatternManager.selection.selectedPattern.value == undefined 
            || sourcePatternManager.selection.selectedPattern.value.id == undefined
        ) {
            sourcePatternManager.selection.setAsSelected(sourcePatternBeginningId)
        }
        currentSentence.value.arcs.forEach( (dependency) => {
            dependency.sourcePatternEdgeId = undefined
        })

        let gremlinCommand = new gremlinApi.GremlinInvoke()
        .call("V", sourcePatternBeginningId)
        .call("repeat", new gremlinApi.GremlinInvoke(true).call("outE").call("inV"))
        .call("until", new gremlinApi.GremlinInvoke(true).call("outE").call("count").call("is", 0))
        .call("limit", 20)
        .call("path")
        .command()
        return new Promise( (resolve, reject) => {
            gremlinApi.submit(gremlinCommand).then( (resultData: any) => {
                const beginWord = currentSentence.value.findBeginWord()
                if (beginWord == undefined) return
                beginWord.sourcePatternVertexId = sourcePatternBeginningId

                // TODO 這 2 個動作可能會造成以後的錯誤
                beginWord.selectedMorphologyInfoTypes.splice(0, beginWord.selectedMorphologyInfoTypes.length)
                beginWord.selectedMorphologyInfoTypes.push(morphologyInfoTypeEnum.pos)

                resultData['@value'].forEach( (path: any) => {
                    const outVId = path['@value'].objects['@value'][0]['@value'].id['@value']
                    const outELabel = path['@value'].objects['@value'][1]['@value'].label
                    const outEId = path['@value'].objects['@value'][1]['@value'].id['@value'].relationId
                    const matchingArc = currentSentence.value.arcs.find( (arc) => {
                        return (
                            currentSentence.value.words[arc.trueStart].sourcePatternVertexId === outVId
                            && arc.label === outELabel
                        )
                    })
                    if (! matchingArc) return
                    matchingArc.sourcePatternEdgeId = outEId
                    // 有了 sourcePatternEdgeId，視同被選取。應該要考慮用 getter 邏輯來處理
                    matchingArc.selected = true
                })
                resolve(sourcePatternBeginningId)
            }).catch ( (error: string) => {
                console.error(error)
                reject(error)
            })
        })
    }

    return {
        patternManager: {
            saveSelectedPattern: saveSelectedPattern
        }
    }

}