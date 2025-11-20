# Generated manually for AI reasoning and confidence explanation fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workflow', '0002_upload_checksum_upload_file_format_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='normalizationresult',
            name='confidence_explanation',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='normalizationresult',
            name='ai_reasoning',
            field=models.TextField(blank=True, null=True),
        ),
    ]

