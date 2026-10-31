import hashlib,json,os,pathlib,unittest
from PIL import Image
from editorial_gate import inspect_video,background_height,text_issues,caption_visible

class HistoricalTrial(unittest.TestCase):
    def test_all_four_original_trial2_videos_are_rejected(self):
        fixture=pathlib.Path(__file__).parent/'fixtures/prova-2'
        manifest=json.loads((fixture/'manifest.json').read_text(encoding='utf-8'))
        self.assertEqual(len(manifest['videos']),4)
        for item in manifest['videos']:
            with self.subTest(video=item['folder']):
                folder=fixture/item['folder']
                for rel,digest in item['sha256'].items():
                    self.assertEqual(hashlib.sha256((folder/rel).read_bytes()).hexdigest(),digest)
                result=inspect_video(folder,tool=item['tool'],recorded_voice=True)
                self.assertFalse(result['passed'])
                self.assertTrue(any('empty background' in e for e in result['errors']))
                self.assertTrue(any('technical command or path' in e or 'repeated code' in e for e in result['errors']))
                if json.loads((folder/'piano.json').read_text())['formato']=='verticale':
                    self.assertLess(result['voiceCoveragePercent'],75)
                    self.assertTrue(any('subtitle coverage' in e for e in result['errors']))
        # On the delivery workstation also run against the real unmodified WAVs.
        original=pathlib.Path(os.environ.get('PROVA2_ROOT',str(pathlib.Path.cwd().parent/'consegna/prova-2/video/skill-tutorial')))
        if original.exists():
            videos=list(original.glob('*/*/piano.json'));self.assertEqual(len(videos),4)
            for p in videos:self.assertFalse(inspect_video(p.parent)['passed'])

    def test_background_is_measured_on_pixels_and_excludes_captions_only(self):
        im=Image.new('RGB',(1080,1920),(49,67,58))
        self.assertEqual(background_height(im,(1660,1860)),100)
        self.assertFalse(caption_visible(im,(1660,1860)))
        im.paste((238,245,240),(100,1660,980,1860))
        self.assertTrue(caption_visible(im,(1660,1860)))
        self.assertEqual(background_height(im,(1660,1860)),100)
        im.paste((39,53,46),(72,200,1008,1500))
        self.assertLess(background_height(im,(1660,1860)),35)

    def test_technical_and_internal_voice_is_rejected(self):
        for s in ['npx skills add owner/repo','Read <style>.','remote-code-load: guide.md:22','For this pipeline, inspect the output.','Run the model:']:
            self.assertTrue(text_issues(s,voice=True),s)
        self.assertTrue(text_issues('Install the skill.',tool=True))
        self.assertEqual(text_issues('Download the model and ask a question.',voice=True,tool=True),[])

    def test_codec_color_shift_does_not_hide_real_content_panels(self):
        original=Image.new('RGB',(1080,1920),(49,67,58))
        original.paste((39,53,46),(72,200,1008,1500))
        encoded=Image.new('RGB',(1080,1920),(52,69,59))
        encoded.paste((42,55,46),(72,200,1008,1500))
        self.assertEqual(background_height(original,(1660,1860)),background_height(encoded,(1660,1860)))
        self.assertLess(background_height(encoded,(1660,1860)),35)

if __name__=='__main__':unittest.main()
