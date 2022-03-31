import { SourcePatternManager, SourcePatternSegmentSelection } from "@/composables/sourcePatternManager";
import { TargetPattern } from "@/composables/targetPatter";
import { aliases, GremlinInvoke, propertyNames, submit } from "@/composables/gremlinManager";
import {
    MorphologyInfo
    , morphologyInfoTypeEnum
    , morphologyInfoUnknownValuePostfix
} from "@/composables/morphologyInfo"
import { ModifiedSpacyToken } from "@/composables/sentenceManager";

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

let $toggling = false

const _toggleMorphologyInfoSelection = (morphologyInfo: MorphologyInfo, selection: SourcePatternSegmentSelection) => {
    const word = morphologyInfo.token
    // 如果 morphology info 是 UNKNOWN，就不繼續動作
    if (word[morphologyInfo.type.propertyInWord].endsWith(morphologyInfoUnknownValuePostfix)) return

    $toggling = true

    const selectedArcs = word.segmentDeps
    if (selectedArcs.length > 0) { // 如果有選 dependency
        if (selectedArcs.filter( (selectedArc) => { // 選起來的 dependency 又都沒有連著現在要選的 token
            return (selectedArc.trueStart === morphologyInfo.token.indexInSentence || selectedArc.trueEnd === morphologyInfo.token.indexInSentence)
        }).length <= 0) return // 就不要選取
    }
    // 執行 toggle
    if (word.selectedMorphologyInfoTypes.includes(morphologyInfo.type)) { // toggle off
        word.unmarkMorphologyInfoAsSelected(morphologyInfo.type)
        word.sourcePatternVertexId = undefined
        if (! word.selectedMorphologyInfoTypes.length) {
            word.isBeginning = false
        }
        // 重新檢查然後標記每個 token 的 begin
        // 然後再針對每個 begin token 處理 source pattern
        // 這些要在新的 segment manager 做
    } else { // toggle on
        word.markMorphologyInfoAsSelected(morphologyInfo.type)
    }
    selection.reloadOptions().then( () => {
        _findExistingMatchSourcePatternAndSetDropdown(word, selection)
    })        
}

const _findExistingMatchSourcePatternAndSetDropdown = (
    beginWord: ModifiedSpacyToken
    , selection: SourcePatternSegmentSelection
    ) => {

    if (! beginWord) return
    const selectedArcsFromBegin = beginWord.segmentDeps
    let gremlinInvoke = new GremlinInvoke()
    .call("V")
    beginWord.selectedMorphologyInfoTypes.forEach( (morphInfoType) => {
        gremlinInvoke = gremlinInvoke.call("has", morphInfoType.name, beginWord[morphInfoType.propertyInWord])
    })
    if (selectedArcsFromBegin.length) {
        gremlinInvoke.where(
            new GremlinInvoke(true)
            .outE()
            .count()
            .is(new GremlinInvoke(true).eq(selectedArcsFromBegin.length))
        )
    }
    const arcSum = new Map();
    selectedArcsFromBegin.forEach( (selectedArc) => {
        if ( arcSum.has(selectedArc.label) ) {
            arcSum.set(selectedArc.label, arcSum.get(selectedArc.label) + 1)
        } else {
            arcSum.set(selectedArc.label, 1)
        }
        // 目前暫時支援查詢到第 1 層的 edge 和隨後的 vertex。如果要再支搜查詢到更後面的線和端，就要用遞迴了
        if (selectedArc.endToken && selectedArc.endToken?.selectedMorphologyInfoTypes.length > 0) {
            // 非 connector 的狀況
            const endToken = selectedArc.endToken
            const endTokenCriteria = new GremlinInvoke(true).out(selectedArc.label)
            Object.values(morphologyInfoTypeEnum).forEach( (morphInfoType, index) => {
                const endTokenPropertyCriteria = new GremlinInvoke(true)
                if (endToken.selectedMorphologyInfoTypes.includes(morphInfoType)) {
                    endTokenPropertyCriteria.has(morphInfoType.name, endToken[morphInfoType.propertyInWord])
                } else {
                    endTokenPropertyCriteria.hasNot(morphInfoType.name)
                }
                const whereOrAnd = index === 0 ? 'where' : 'and'
                endTokenCriteria.call(whereOrAnd, endTokenPropertyCriteria)
            })
            gremlinInvoke.where(endTokenCriteria)
        } else {
            // connector 的狀況
            gremlinInvoke.where(
                new GremlinInvoke(true)
                .out(selectedArc.label)
                .where(new GremlinInvoke(true).has(propertyNames.isConnector, true))
                .count()
                .is(new GremlinInvoke(true).eq(1))
            )
        }
    })
    arcSum.forEach( (value, key) => {
        gremlinInvoke.call(
            "and"
            , new GremlinInvoke(true)
            .call("outE", key)
            .call("count")
            .call("is", new GremlinInvoke(true).gte(value))
        )
    })
    submit(gremlinInvoke).then( (resultData: any) => {
        if (resultData['@value'].length === 0) {
            selection.setAsSelected(undefined)
            return
        }
        const sourcePatternBeginningId = resultData['@value'][0]['@value'].id['@value']
        selection.setAsSelected(sourcePatternBeginningId)
    })
}
