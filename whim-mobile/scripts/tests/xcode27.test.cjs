/* eslint-env node */
const test = require('node:test');
const assert = require('node:assert/strict');
const { addPodTargetFix } = require('../../plugins/withXcode27PodTargets');

const PODFILE = `platform :ios, podfile_properties['ios.deploymentTarget'] || '15.1'
target 'Whim' do
  post_install do |installer|
    react_native_post_install(installer, config[:reactNativePath])
  end
end
`;

test('Xcode 27 pod-target fix lands inside post_install once and is idempotent', () => {
  const once = addPodTargetFix(PODFILE);
  assert.equal(addPodTargetFix(once), once); // a second prebuild changes nothing
  assert.equal(once.match(/@generated begin whim-xcode27-pod-targets/g).length, 1);
  const body = once.slice(once.indexOf('post_install do |installer|'), once.indexOf('react_native_post_install'));
  assert.match(body, /installer\.pods_project\.targets\.each/);
  assert.match(body, /min_ios = podfile_properties\['ios\.deploymentTarget'\] \|\| '15\.1'/);
});
