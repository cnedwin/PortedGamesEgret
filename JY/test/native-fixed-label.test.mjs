import {test} from 'node:test';
import assert from 'node:assert/strict';
import '../vendor/node-register.mjs';
const {isFixedGlyphText,normalizeFloatingLabel,FIXED_NUMBER_CHARACTERS,FIXED_SIGNED_INTEGER_CHARACTERS,createTextWorkPressure}=await import('../web/jyx2/ui/native/fixed-labels.mjs');

test('fixed glyph routing refuses unsupported text without lossy substitution',()=>{
  for(const value of ['-125','+5','0','12.7','21/42','00:10','-0.5%','−8'])
    assert.equal(isFixedGlyphText(value),true,value);
  for(const value of ['', 'status', 'Sample note','12 A','１２３','\n12'])
    assert.equal(isFixedGlyphText(value),false,value);
  assert.equal(FIXED_NUMBER_CHARACTERS.includes('0'),true);
  assert.equal(isFixedGlyphText('12.7',FIXED_SIGNED_INTEGER_CHARACTERS),false);
});
test('dense text policy reserves the whole batch, then returns to immediate native work',()=>{
  const gate=createTextWorkPressure(4);
  const release1=gate.begin(1);
  assert.equal(gate.when(),false);
  const releaseBatch=gate.begin(5);
  assert.equal(gate.when(),true);
  releaseBatch();releaseBatch();releaseBatch();
  assert.equal(gate.when(),false);
  releaseBatch();releaseBatch();releaseBatch();release1();release1();
  assert.equal(gate.pending,0);
});
test('visual fields are independent of the host value/position and normalized once',()=>{
  const source={key:0,text:-5,size:25,color:0x88aa33,x:12.5,y:20.5,alpha:.6};
  const record=normalizeFloatingLabel(source);
  assert.deepEqual(record,{key:0,text:'-5',size:25,color:0x88aa33,alpha:.6});
  assert.equal(source.text,-5);
  assert.throws(()=>normalizeFloatingLabel({text:'x'}),/key/);
});
