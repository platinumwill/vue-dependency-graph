<template>
  <g
    class="displacy-arrow"
    :key="arc.start"
    :data-dir="arc.dir"
    :data-label="arc.label"
  >
    <path
      :d="d"
      :stroke-width="strokeWidth"
      :data-dir="arc.dir"
      :data-label="arc.label"
      :id="id"
      class="displacy-arc"
      fill="none"
      :stroke="color"
    ></path>
    <text dy="1em">
        <textPath :xlink:href="'#' + id" class="displacy-label"
            :data-label="arc.label"
            :data-dir="arc.dir"
            @click="edgeLabelClicked"
            startOffset="50%" side="left" :fill="color" text-anchor="middle">{{ arc.label }}</textPath>
    </text>
    <path class="displacy-arrowhead" :d="arrowheadD" :fill="color" :data-label="arc.label" :data-dir="arc.dir" />
 </g>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
    name: 'DependencyEdge'
    , data() {
        return {
        }
    }
    , props: {
        arc: Object
    }
    , inject: [
        'config'
        , 'spacyFormatSentences'
    ]
    , methods: {
        edgeLabelClicked: function() {
            if (!this.arc.beginToken.translationHelper) return
            this.arc.beginToken.translationHelper.toggleDependencySelection(this.arc)
        }
    }
    , computed: {
        level: function() {
            return this.$parent.levels.indexOf(this.arc.end - this.arc.start) + 1
        }
        , startX: function() {
            const result = this.config.offsetX + this.arc.start * this.config.distance + this.config.arrowSpacing * (this.$parent.highestLevel - this.level) / 4
            return result
        }
        , startY: function () {
            return this.$parent.offsetY 
        }
        , curve: function() {
            let result = this.$parent.offsetY - this.level * this.config.distance / 2;
            if(result == 0 && this.$parent.levels.length > 5) result = -this.config.distance;
            return result
        }
        , endpoint: function () {
            return this.config.offsetX + (this.arc.end - this.arc.start) * this.config.distance + this.arc.start * this.config.distance - this.config.arrowSpacing * (this.$parent.highestLevel - this.level) / 4;
        }
        , strokeWidth: function() {
            return this.config.arrowStroke + "px"
        }
        , d: function() {
            return "M" + this.startX + "," + this.startY 
            + " " + "C" + this.startX + "," + this.curve
            + " " + this.endpoint + "," + this.curve 
            + " " + this.endpoint + "," + this.startY
        }
        , id: function() {
            return 'arrow-' + Math.random().toString(36).substr(2, 8)
        }
        , arrowheadD: function() {
            return ""
            + "M" + ((this.arc.dir == 'left') ? this.startX : this.endpoint)
            + "," + (this.startY + 2)
            + " " 
            + "L" + ((this.arc.dir == 'left') ? this.startX - this.config.arrowWidth + 2 : this.endpoint + this.config.arrowWidth - 2)
            + "," + (this.startY - this.config.arrowWidth)
            + " " + ((this.arc.dir == 'left') ? this.startX + this.config.arrowWidth - 2 : this.endpoint - this.config.arrowWidth + 2)
            + "," + (this.startY - this.config.arrowWidth) 
        }
        , color: function() {
            if (this.matchExisting) {
                return "yellow"
            } else if (this.selected) {
                return this.config.selectedForegroundColor 
            }
            return 'currentColor'
        }
        , selected: function() {
            return this.spacyFormatSentences[this.currentSentenceIndex].arcs[this.arc.indexInSentence].selected
        }
        , matchExisting: function() {
            return this.arc.sourcePatternEdgeId !== undefined
        }
        , ...mapGetters({ 
            currentSentenceIndex: 'currentSentenceIndex'
        })
   }
}
</script>